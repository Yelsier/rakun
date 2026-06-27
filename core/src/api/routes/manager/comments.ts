import { ContentComment, ManagerUser } from "../../../internal-content-types";
import { throwAppError } from "../../../lib/errors";
import { getMongoService } from "../../../orm";
import type {
  CommentRecord,
  CreateCommentInput,
  CreateCommentOutput,
  ListCommentsInput,
  ListCommentsOutput,
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
};

const DEFAULT_COMMENT_LIMIT = 100;
const MAX_COMMENT_LIMIT = 200;

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
    ]).filter((id): id is string => Boolean(id)),
  );
  const usersById = await loadMentionUsers(userIds);

  return comments.map((comment) => {
    const authorId = getRelationId(comment.author) ?? "";

    return {
      _id: comment._id,
      text: comment.text,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: usersById.get(authorId) ?? fallbackMentionUser(authorId),
      mentions: getRelationIds(comment.mentions).map(
        (id) => usersById.get(id) ?? fallbackMentionUser(id),
      ),
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
