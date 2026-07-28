import {
  ContentComment,
  ContentCommentReadState,
  ManagerUser,
} from "../../../internal-content-types";
import { throwAppError } from "../../../lib/errors";
import { getMongoService } from "../../../orm";
import type {
  CommentReactionEmoji,
  CommentRecord,
  CommentReferenceInput,
  CreateCommentInput,
  CreateCommentOutput,
  ListCommentsInput,
  ListCommentsOutput,
  MarkCommentsReadInput,
  MarkCommentsReadOutput,
  ToggleCommentReactionInput,
  ToggleCommentReactionOutput,
  UnreadCommentsCountOutput,
} from "../../../schemas/manager/comments";
import type { RakunRequestContext } from "../../context";
import { checkOwnership } from "../../utils/checkOwnership";
import { requireContentType } from "../../utils/requireContentType";
import {
  fallbackMentionUser,
  toMentionUser,
} from "./users";
import { createManagerNotification } from "../../utils/managerNotifications";
import {
  findLatestReview,
  getDocumentRevisionToken,
  getRelationId as getReviewRelationId,
  type StoredReview,
} from "../../utils/reviews";

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
  const user = ctx.getUser();
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
  const readState = await db.find(ContentCommentReadState, {
    "user._id": user._id,
    contentType: input.contentType,
    documentId: input.documentId,
  } as never);

  return {
    totalItems: result.totalItems,
    comments: await resolveComments(result.items as StoredComment[]),
    lastReadCommentId: readState?.lastReadCommentId,
  };
};

export const createCommentHandler = async ({
  input,
  ctx,
}: {
  input: CreateCommentInput;
  ctx: RakunRequestContext;
}): Promise<CreateCommentOutput> => {
  const contentType = await requireCommentableDocument({
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
  const canLoadDocument =
    typeof (db as unknown as { get?: unknown }).get === "function";
  const document = canLoadDocument
    ? ((await db.get(contentType, input.documentId)) as Record<string, unknown>)
    : undefined;
  const revisionToken = document
    ? getDocumentRevisionToken(document)
    : undefined;
  const activeReview = revisionToken
    ? ((await findLatestReview({
        contentType: input.contentType,
        documentId: input.documentId,
        revisionToken,
      })) as StoredReview | null)
    : null;
  const notificationKinds = new Map<
    string,
    "comment_mention" | "review_feedback"
  >(mentionIds.map((id) => [id, "comment_mention"]));
  if (
    activeReview &&
    activeReview.revisionToken === revisionToken &&
    activeReview.status === "pending"
  ) {
    const reviewAuthorId = getReviewRelationId(activeReview.author);
    if (reviewAuthorId) notificationKinds.set(reviewAuthorId, "review_feedback");
  }
  await Promise.all(
    Array.from(notificationKinds.entries()).map(([id, kind]) =>
      createManagerNotification({
        userId: id,
        authorId: user._id,
        eventId: comment._id,
        kind,
        reviewId: kind === "review_feedback" ? activeReview?._id : undefined,
        contentType: input.contentType,
        documentId: input.documentId,
        text: input.text.trim(),
      }),
    ),
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

export const markCommentsReadHandler = async ({
  input,
  ctx,
}: {
  input: MarkCommentsReadInput;
  ctx: RakunRequestContext;
}): Promise<MarkCommentsReadOutput> => {
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

  await db.upsert(
    ContentCommentReadState,
    {
      "user._id": user._id,
      contentType: input.contentType,
      documentId: input.documentId,
    } as never,
    {
      _type: ContentCommentReadState.name,
      user: {
        type: "existing",
        _id: user._id,
        contentType: ManagerUser.name,
      },
      contentType: input.contentType,
      documentId: input.documentId,
      lastReadCommentId: input.commentId,
      createdBy: user._id,
      updatedBy: user._id,
    },
    { actorId: user._id },
  );

  return {
    lastReadCommentId: input.commentId,
  };
};

export const unreadCommentsCountHandler = async ({
  input,
  ctx,
}: {
  input: CommentReferenceInput;
  ctx: RakunRequestContext;
}): Promise<UnreadCommentsCountOutput> => {
  await requireCommentableDocument({
    ctx,
    contentTypeName: input.contentType,
    documentId: input.documentId,
  });

  const db = await getMongoService();
  const user = ctx.getUser();
  const [commentsResult, readState] = await Promise.all([
    db.list(ContentComment, {
      filter: {
        contentType: input.contentType,
        documentId: input.documentId,
      },
      options: {
        fields: ["author"],
        limit: "all",
        sort: { createdAt: "asc" } as never,
      },
    }),
    db.find(ContentCommentReadState, {
      "user._id": user._id,
      contentType: input.contentType,
      documentId: input.documentId,
    } as never),
  ]);
  const comments = commentsResult.items as StoredComment[];
  const lastReadIndex = readState?.lastReadCommentId
    ? comments.findIndex(
        (comment) => comment._id === readState.lastReadCommentId,
      )
    : -1;
  const unreadComments =
    lastReadIndex >= 0 ? comments.slice(lastReadIndex + 1) : comments;

  return {
    count: unreadComments.filter(
      (comment) => getRelationId(comment.author) !== user._id,
    ).length,
  };
};
