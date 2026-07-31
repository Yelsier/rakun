import {
  ManagerNotification,
  ManagerUser,
} from "../../../internal-content-types";
import { getContentTypeByName } from "../../../lib/Registry";
import { getMongoService } from "../../../orm";
import type {
  ListNotificationsInput,
  ListNotificationsOutput,
  MarkNotificationsReadInput,
  MarkNotificationsReadOutput,
} from "../../../schemas/manager/notifications";
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

type StoredNotification = {
  _id: string;
  commentId: string;
  kind?:
    | "comment_mention"
    | "review_requested"
    | "review_approved"
    | "review_changes_requested"
    | "review_feedback"
    | "redirect_enable_requested";
  reviewId?: string;
  contentType: string;
  documentId: string;
  text: string;
  createdAt?: Date;
  author?: StoredRelation;
  read: boolean;
};

const DEFAULT_NOTIFICATION_LIMIT = 50;
const MAX_NOTIFICATION_SCAN = 500;

const getRelationId = (value: unknown) =>
  value && typeof value === "object" && "_id" in value
    ? String((value as StoredRelation)._id)
    : undefined;

const getNestedValue = (source: Record<string, unknown>, path?: string) => {
  if (!path) return undefined;

  return path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === "object"
          ? (value as Record<string, unknown>)[key]
          : undefined,
      source,
    );
};

const loadAuthors = async (notifications: StoredNotification[]) => {
  const ids = Array.from(
    new Set(
      notifications
        .map((notification) => getRelationId(notification.author))
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (ids.length === 0) {
    return new Map<string, ReturnType<typeof fallbackMentionUser>>();
  }

  const db = await getMongoService();
  const users = await db.list(ManagerUser, {
    filter: { _id: { $in: ids } } as never,
    options: {
      fields: ["name", "user", "avatarUrl", "avatarPreviewUrl"],
      limit: "all",
    },
  });

  return new Map(users.items.map((user) => [user._id, toMentionUser(user)]));
};

const resolveNotification = async ({
  ctx,
  notification,
  authors,
}: {
  ctx: RakunRequestContext;
  notification: StoredNotification;
  authors: Awaited<ReturnType<typeof loadAuthors>>;
}): Promise<ListNotificationsOutput["notifications"][number] | null> => {
  const contentType = getContentTypeByName(notification.contentType);

  if (!contentType) return null;

  try {
    await checkOwnership({
      ctx,
      contentType,
      id: notification.documentId,
      permission:
        notification.kind === "redirect_enable_requested"
          ? "updateAny"
          : "readAny",
    });

    const titleField = contentType.listFields?.[0];
    const document = titleField
      ? ((await (await getMongoService()).get(
          contentType,
          notification.documentId,
          [titleField],
        )) as Record<string, unknown>)
      : undefined;
    const authorId = getRelationId(notification.author) ?? "";

    return {
      _id: notification._id,
      ...(notification.kind ? { kind: notification.kind } : {}),
      commentId:
        !notification.kind || notification.kind === "comment_mention"
          ? notification.commentId
          : undefined,
      ...(notification.reviewId ? { reviewId: notification.reviewId } : {}),
      contentType: notification.contentType,
      documentId: notification.documentId,
      title: document ? getNestedValue(document, titleField) : undefined,
      text: notification.text,
      createdAt: notification.createdAt,
      author: authors.get(authorId) ?? fallbackMentionUser(authorId),
      read: notification.read,
    };
  } catch (_) {
    return null;
  }
};

export const listNotificationsHandler = async ({
  input,
  ctx,
}: {
  input: ListNotificationsInput;
  ctx: RakunRequestContext;
}): Promise<ListNotificationsOutput> => {
  const db = await getMongoService();
  const user = ctx.getUser();
  const stored = (
    await db.list(ManagerNotification, {
      filter: {
        "user._id": user._id,
        ...(input?.contentType ? { contentType: input.contentType } : {}),
        ...(input?.documentId ? { documentId: input.documentId } : {}),
      } as never,
      options: {
        limit: MAX_NOTIFICATION_SCAN,
        sort: { createdAt: "desc" } as never,
      },
    })
  ).items as StoredNotification[];
  const authors = await loadAuthors(stored);
  const resolved = (
    await Promise.all(
      stored.map((notification) =>
        resolveNotification({
          ctx,
          notification,
          authors,
        }),
      ),
    )
  ).filter(
    (
      notification,
    ): notification is ListNotificationsOutput["notifications"][number] =>
      Boolean(notification),
  );
  const totalUnread = resolved.filter((notification) => !notification.read).length;
  const notifications = input?.unreadOnly
    ? resolved.filter((notification) => !notification.read)
    : resolved;

  return {
    notifications: notifications.slice(
      0,
      input?.limit ?? DEFAULT_NOTIFICATION_LIMIT,
    ),
    totalUnread,
  };
};

export const markNotificationsReadHandler = async ({
  input,
  ctx,
}: {
  input: MarkNotificationsReadInput;
  ctx: RakunRequestContext;
}): Promise<MarkNotificationsReadOutput> => {
  const db = await getMongoService();
  const user = ctx.getUser();
  const contentType = requireContentType(input.contentType);

  await checkOwnership({
    ctx,
    contentType,
    id: input.documentId,
    permission: "readAny",
  });

  const notifications = (
    await db.list(ManagerNotification, {
      filter: {
        "user._id": user._id,
        contentType: input.contentType,
        documentId: input.documentId,
        read: false,
        ...(input.notificationId ? { _id: input.notificationId } : {}),
      } as never,
      options: {
        limit: "all",
      },
    })
  ).items;

  await Promise.all(
    notifications.map((notification) =>
      db.update(
        ManagerNotification,
        notification._id,
        {
          read: true,
          updatedBy: user._id,
        },
        { actorId: user._id },
      ),
    ),
  );

  return {
    markedRead: notifications.length,
  };
};
