import { ContentComment, ManagerUser } from "../../../internal-content-types";
import { throwAppError } from "../../../lib/errors";
import { getMongoService } from "../../../orm";
import type {
  CommentReactionEmoji,
  CommentRecord,
  CreateCommentInput,
  CreateCommentOutput,
  ListCommentsInput,
  ListCommentsOutput,
  ToggleCommentReactionInput,
  ToggleCommentReactionOutput,
} from "../../../schemas/manager/comments";
import type { RakunRequestContext } from "../../context";
import { checkOwnership } from "../../utils/checkOwnership";
import { requireContentType } from "../../utils/requireContentType";
import {
  fallbackMentionUser,
  toMentionUser,
} from "./users";

type StoredRelation = {
  _id?: string;
};

type StoredComment = {
  _id: string;
  text: string;
  createdAt?: Date;
  updatedAt?: Date;
  author?: StoredRelation;
  mentions?: StoredRelation[];
  reactions?: string[];
};

const DEFAULT_COMMENT_LIMIT = 100;
const MAX_COMMENT_LIMIT = 200;
const REACTION_KEY_SEPARATOR = ":";

const normalizeReactionEmoji = (emoji: string): CommentReactionEmoji => emoji.trim();

const requireCommentableDocument = async ({
  ctx,
  contentTypeName,
  documentId,
}: {
  ctx: RakunRequestContext;
  contentTypeName: string;
  documentId: string;
}) => {
  const contentType = requireContentType(contentTypeName);

  if (!contentType.comments) {
    throwAppError("FEATURE_UNSUPPORTED", {
      feature: "comments",
      message: `Comments are not enabled for content type ${contentType.name}`,
    });
  }

  await checkOwnership({
    ctx,
    contentType,
    id: documentId,
    permission: "readAny",
  });

  return contentType;
};

const getRelationId = (value: unknown) =>
  value && typeof value === "object" && "_id" in value
    ? String((value as StoredRelation)._id)
    : undefined;

const getRelationIds = (values: unknown) =>
  Array.isArray(values)
    ? values.map(getRelationId).filter((id): id is string => Boolean(id))
    : [];

const uniqueIds = (ids: string[]) => Array.from(new Set(ids));

const encodeReactionKey = ({
  emoji,
  userId,
}: {
  emoji: CommentReactionEmoji;
  userId: string;
}) => `${encodeURIComponent(normalizeReactionEmoji(emoji))}${REACTION_KEY_SEPARATOR}${userId}`;

const getReactionKeys = (values: unknown) =>
  Array.isArray(values)
    ? values.filter((value): value is string => typeof value === "string")
    : [];

const parseReactionKey = (value: string) => {
  const separatorIndex = value.lastIndexOf(REACTION_KEY_SEPARATOR);

  if (separatorIndex <= 0) return null;

  const rawEmoji = value.slice(0, separatorIndex);
  const userId = value.slice(separatorIndex + REACTION_KEY_SEPARATOR.length);
  let emoji = rawEmoji;

  try {
    emoji = decodeURIComponent(rawEmoji);
  } catch (_) {
    emoji = rawEmoji;
  }

  emoji = normalizeReactionEmoji(emoji);

  if (!userId || !emoji) {
    return null;
  }

  return {
    emoji,
    userId,
  };
};

const getParsedReactions = (values: unknown) =>
  getReactionKeys(values)
    .map(parseReactionKey)
    .filter(
      (
        reaction,
      ): reaction is {
        emoji: CommentReactionEmoji;
        userId: string;
      } => Boolean(reaction),
    );

const getReactionUserIds = (values: unknown) =>
  getParsedReactions(values).map((reaction) => reaction.userId);

const loadMentionUsers = async (ids: string[]) => {
  const unique = uniqueIds(ids);

  if (unique.length === 0) {
    return new Map<string, ReturnType<typeof fallbackMentionUser>>();
  }

  const db = await getMongoService();
  const users = await db.list(ManagerUser, {
    filter: { _id: { $in: unique } } as never,
    options: {
      fields: ["name", "user", "avatarUrl", "avatarPreviewUrl"],
      limit: "all",
    },
  });

  return new Map(users.items.map((user) => [user._id, toMentionUser(user)]));
};

const resolveComments = async (comments: StoredComment[]): Promise<CommentRecord[]> => {
  const userIds = uniqueIds(
    comments.flatMap((comment) => [
      getRelationId(comment.author),
      ...getRelationIds(comment.mentions),
      ...getReactionUserIds(comment.reactions),
    ]).filter((id): id is string => Boolean(id)),
  );
  const usersById = await loadMentionUsers(userIds);

  return comments.map((comment) => {
    const authorId = getRelationId(comment.author) ?? "";
    const reactionsByEmoji = new Map<CommentReactionEmoji, string[]>();

    for (const reaction of getParsedReactions(comment.reactions)) {
      const users = reactionsByEmoji.get(reaction.emoji) ?? [];

      if (!users.includes(reaction.userId)) {
        users.push(reaction.userId);
      }

      reactionsByEmoji.set(reaction.emoji, users);
    }

    return {
      _id: comment._id,
      text: comment.text,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: usersById.get(authorId) ?? fallbackMentionUser(authorId),
      mentions: getRelationIds(comment.mentions).map(
        (id) => usersById.get(id) ?? fallbackMentionUser(id),
      ),
      reactions: Array.from(reactionsByEmoji.entries()).map(([emoji, userIds]) => ({
        emoji,
        users: userIds.map((id) => usersById.get(id) ?? fallbackMentionUser(id)),
      })),
    };
  });
};

export const listCommentsHandler = async ({
  input,
  ctx,
}: {
  input: ListCommentsInput;
  ctx: RakunRequestContext;
}): Promise<ListCommentsOutput> => {
  await requireCommentableDocument({
    ctx,
    contentTypeName: input.contentType,
    documentId: input.documentId,
  });

  const limit = Math.min(input.limit ?? DEFAULT_COMMENT_LIMIT, MAX_COMMENT_LIMIT);
  const db = await getMongoService();
  const result = await db.list(ContentComment, {
    filter: {
      contentType: input.contentType,
      documentId: input.documentId,
    },
    options: {
      limit,
      sort: { createdAt: "asc" } as never,
    },
  });

  return {
    totalItems: result.totalItems,
    comments: await resolveComments(result.items as StoredComment[]),
  };
};

export const createCommentHandler = async ({
  input,
  ctx,
}: {
  input: CreateCommentInput;
  ctx: RakunRequestContext;
}): Promise<CreateCommentOutput> => {
  await requireCommentableDocument({
    ctx,
    contentTypeName: input.contentType,
    documentId: input.documentId,
  });

  const db = await getMongoService();
  const user = ctx.getUser();
  const mentionsById = await loadMentionUsers(input.mentions ?? []);
  const mentionIds = uniqueIds(input.mentions ?? []).filter((id) => mentionsById.has(id));
  const comment = await db.create(
    ContentComment,
    {
      _type: ContentComment.name,
      contentType: input.contentType,
      documentId: input.documentId,
      author: {
        type: "existing",
        _id: user._id,
        contentType: ManagerUser.name,
      },
      text: input.text.trim(),
      mentions: mentionIds.map((id) => ({
        type: "existing",
        _id: id,
        contentType: ManagerUser.name,
      })),
      reactions: [],
      createdBy: user._id,
      updatedBy: user._id,
    },
    { actorId: user._id },
  );

  const [resolved] = await resolveComments([comment as StoredComment]);

  return {
    comment: resolved,
  };
};

export const toggleCommentReactionHandler = async ({
  input,
  ctx,
}: {
  input: ToggleCommentReactionInput;
  ctx: RakunRequestContext;
}): Promise<ToggleCommentReactionOutput> => {
  await requireCommentableDocument({
    ctx,
    contentTypeName: input.contentType,
    documentId: input.documentId,
  });

  const db = await getMongoService();
  const user = ctx.getUser();
  const comment = await db.find(ContentComment, {
    _id: input.commentId,
    contentType: input.contentType,
    documentId: input.documentId,
  } as never);

  if (!comment) {
    throwAppError("NOT_FOUND", {
      resource: "ContentComment",
      id: input.commentId,
    });
  }

  const currentKeys = uniqueIds(
    getParsedReactions((comment as StoredComment).reactions).map(encodeReactionKey),
  );
  const reactionKey = encodeReactionKey({
    emoji: normalizeReactionEmoji(input.emoji),
    userId: user._id,
  });
  const nextKeys = currentKeys.includes(reactionKey)
    ? currentKeys.filter((key) => key !== reactionKey)
    : [...currentKeys, reactionKey];
  const updated = await db.update(
    ContentComment,
    input.commentId,
    {
      reactions: nextKeys,
      updatedBy: user._id,
    } as never,
    { actorId: user._id },
  );
  const [resolved] = await resolveComments([updated as StoredComment]);

  return {
    comment: resolved,
  };
};
