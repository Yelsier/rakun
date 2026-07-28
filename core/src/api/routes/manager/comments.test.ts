import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockGetMongoService = mock();

mock.module("../../../orm", () => ({
  getMongoService: mockGetMongoService,
}));

import ContentType from "../../../lib/ContentType";
import { Fields } from "../../../lib/fields";
import { createLogger } from "../../../lib/Logger";
import { encodeContentTypeForManager, registerContentType } from "../../../lib/Registry";
import {
  ContentComment,
  ContentCommentReadState,
  ManagerNotification,
  ManagerUser,
} from "../../../internal-content-types";

const {
  createCommentHandler,
  listCommentsHandler,
  markCommentsReadHandler,
  toggleCommentReactionHandler,
  unreadCommentsCountHandler,
} = await import("./comments");
const {
  listNotificationsHandler,
  markNotificationsReadHandler,
} = await import("./notifications");
const { listMentionUsersHandler } = await import("./users");
const { deleteHandler } = await import("./delete");

const CommentArticle = new ContentType({
  name: "CommentArticle",
  fields: {
    title: Fields.string(),
  },
  listFields: ["title"],
});

const CommentDisabledArticle = new ContentType({
  name: "CommentDisabledArticle",
  fields: {
    title: Fields.string(),
  },
});

registerContentType(CommentArticle);
registerContentType(CommentDisabledArticle);

const userId = "507f1f77bcf86cd799439011";
const mentionUserId = "507f1f77bcf86cd799439012";
const documentId = "507f1f77bcf86cd799439013";
const commentId = "507f1f77bcf86cd799439014";
const notificationId = "507f1f77bcf86cd799439015";
const unreadCommentId = "507f1f77bcf86cd799439016";
const createdAt = new Date("2026-06-15T10:00:00.000Z");

const ctx = {
  getUser: () => ({
    _id: userId,
    _type: "ManagerUser",
    name: "Yago Claros",
    user: "yago",
    email: "yago@example.com",
    role: {
      permissions: [
        "content.CommentArticle.readAny",
        "content.CommentArticle.deleteAny",
        "content.CommentDisabledArticle.readAny",
      ],
    },
  }),
};

const managerUsers = [
  {
    _id: userId,
    _type: ManagerUser.name,
    name: "Yago Claros",
    user: "yago",
    avatarUrl: "https://example.com/avatar.webp",
    avatarPreviewUrl: "https://example.com/avatar-small.webp",
  },
  {
    _id: mentionUserId,
    _type: ManagerUser.name,
    name: "Editor One",
    user: "editor",
  },
];

describe("manager comments", () => {
  beforeEach(() => {
    createLogger({ level: "fatal" });
    mockGetMongoService.mockReset();
  });

  it("does not require comments metadata on manager content types", () => {
    expect(encodeContentTypeForManager(CommentArticle)).not.toHaveProperty("comments");
    expect(encodeContentTypeForManager(CommentDisabledArticle)).not.toHaveProperty(
      "comments",
    );
  });

  it("lists mention users without requiring ManagerUser read permissions", async () => {
    const db = {
      list: mock(async () => ({
        totalItems: managerUsers.length,
        items: managerUsers,
      })),
    };

    mockGetMongoService.mockResolvedValue(db);

    const result = await listMentionUsersHandler({ ctx } as never);

    expect(result).toEqual([
      {
        _id: userId,
        name: "Yago Claros",
        user: "yago",
        avatar: {
          url: "https://example.com/avatar.webp",
          previewUrl: "https://example.com/avatar-small.webp",
        },
      },
      {
        _id: mentionUserId,
        name: "Editor One",
        user: "editor",
        avatar: null,
      },
    ]);
  });

  it("lists comments for readers of the target document", async () => {
    const db = {
      find: mock(async () => ({ _id: documentId, createdBy: "someone-else" })),
      list: mock(async (contentType) =>
        contentType.name === ContentComment.name
          ? {
              totalItems: 1,
              items: [
                {
                  _id: commentId,
                  _type: ContentComment.name,
                  contentType: CommentArticle.name,
                  documentId,
                  text: "Looks good @editor",
                  author: {
                    type: "existing",
                    _id: userId,
                    contentType: ManagerUser.name,
                  },
                  mentions: [
                    {
                      type: "existing",
                      _id: mentionUserId,
                      contentType: ManagerUser.name,
                    },
                  ],
                  reactions: [`%F0%9F%91%8D:${mentionUserId}`],
                  createdAt,
                },
              ],
            }
          : {
              totalItems: managerUsers.length,
              items: managerUsers,
            },
      ),
    };

    mockGetMongoService.mockResolvedValue(db);

    const result = await listCommentsHandler({
      input: {
        contentType: CommentArticle.name,
        documentId,
      },
      ctx,
    } as never);

    expect(result).toEqual({
      totalItems: 1,
      lastReadCommentId: undefined,
      comments: [
        {
          _id: commentId,
          text: "Looks good @editor",
          createdAt,
          updatedAt: undefined,
          author: {
            _id: userId,
            name: "Yago Claros",
            user: "yago",
            avatar: {
              url: "https://example.com/avatar.webp",
              previewUrl: "https://example.com/avatar-small.webp",
            },
          },
          mentions: [
            {
              _id: mentionUserId,
              name: "Editor One",
              user: "editor",
              avatar: null,
            },
          ],
          reactions: [
            {
              emoji: "👍",
              users: [
                {
                  _id: mentionUserId,
                  name: "Editor One",
                  user: "editor",
                  avatar: null,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("creates comments with existing mentions", async () => {
    const create = mock(async (_contentType, data) => ({
      _id: commentId,
      ...data,
      createdAt,
    }));
    const db = {
      find: mock(async () => ({ _id: documentId, createdBy: "someone-else" })),
      list: mock(async () => ({
        totalItems: managerUsers.length,
        items: managerUsers,
      })),
      create,
    };

    mockGetMongoService.mockResolvedValue(db);

    const result = await createCommentHandler({
      input: {
        contentType: CommentArticle.name,
        documentId,
        text: "  Please review  ",
        mentions: [mentionUserId, "507f1f77bcf86cd799439099"],
      },
      ctx,
    } as never);

    expect(create).toHaveBeenCalledWith(
      ContentComment,
      {
        _type: ContentComment.name,
        contentType: CommentArticle.name,
        documentId,
        author: {
          type: "existing",
          _id: userId,
          contentType: ManagerUser.name,
        },
        text: "Please review",
        mentions: [
          {
            type: "existing",
            _id: mentionUserId,
            contentType: ManagerUser.name,
          },
        ],
        reactions: [],
        createdBy: userId,
        updatedBy: userId,
      },
      { actorId: userId },
    );
    expect(create).toHaveBeenCalledWith(
      ManagerNotification,
      {
        _type: ManagerNotification.name,
        user: {
          type: "existing",
          _id: mentionUserId,
          contentType: ManagerUser.name,
        },
        author: {
          type: "existing",
          _id: userId,
          contentType: ManagerUser.name,
        },
        commentId,
        contentType: CommentArticle.name,
        documentId,
        text: "Please review",
        read: false,
        createdBy: userId,
        updatedBy: userId,
      },
      { actorId: userId },
    );
    expect(result.comment.text).toBe("Please review");
    expect(result.comment.mentions).toHaveLength(1);
    expect(result.comment.reactions).toEqual([]);
  });

  it("toggles comment reactions for readers of the target document", async () => {
    let storedReactions: string[] = [];
    const update = mock(async (_contentType, _id, data) => {
      storedReactions = data.reactions;

      return {
        _id: commentId,
        _type: ContentComment.name,
        contentType: CommentArticle.name,
        documentId,
        text: "Looks good",
        author: {
          type: "existing",
          _id: mentionUserId,
          contentType: ManagerUser.name,
        },
        mentions: [],
        ...data,
        createdAt,
      };
    });
    const db = {
      find: mock(async (contentType, filter) =>
        contentType.name === ContentComment.name
          ? {
              _id: commentId,
              _type: ContentComment.name,
              contentType: CommentArticle.name,
              documentId,
              text: "Looks good",
              author: {
                type: "existing",
                _id: mentionUserId,
                contentType: ManagerUser.name,
              },
              mentions: [],
              reactions: storedReactions,
            }
          : { _id: filter._id, createdBy: "someone-else" },
      ),
      list: mock(async () => ({
        totalItems: managerUsers.length,
        items: managerUsers,
      })),
      update,
    };

    mockGetMongoService.mockResolvedValue(db);

    const result = await toggleCommentReactionHandler({
      input: {
        contentType: CommentArticle.name,
        documentId,
        commentId,
        emoji: "👀",
      },
      ctx,
    } as never);

    expect(update).toHaveBeenCalledWith(
      ContentComment,
      commentId,
      {
        reactions: [`%F0%9F%91%80:${userId}`],
        updatedBy: userId,
      },
      { actorId: userId },
    );
    expect(result.comment.reactions).toEqual([
      {
        emoji: "👀",
        users: [
          {
            _id: userId,
            name: "Yago Claros",
            user: "yago",
            avatar: {
              url: "https://example.com/avatar.webp",
              previewUrl: "https://example.com/avatar-small.webp",
            },
          },
        ],
      },
    ]);

    const removeResult = await toggleCommentReactionHandler({
      input: {
        contentType: CommentArticle.name,
        documentId,
        commentId,
        emoji: "👀",
      },
      ctx,
    } as never);

    expect(update).toHaveBeenLastCalledWith(
      ContentComment,
      commentId,
      {
        reactions: [],
        updatedBy: userId,
      },
      { actorId: userId },
    );
    expect(removeResult.comment.reactions).toEqual([]);
  });

  it("supports comments for content types without feature configuration", async () => {
    const db = {
      find: mock(async () => ({ _id: documentId, createdBy: "someone-else" })),
      list: mock(async () => ({ totalItems: 0, items: [] })),
    };

    mockGetMongoService.mockResolvedValue(db);

    const result = await listCommentsHandler({
      input: {
        contentType: CommentDisabledArticle.name,
        documentId,
      },
      ctx,
    } as never);

    expect(result).toEqual({
      totalItems: 0,
      comments: [],
      lastReadCommentId: undefined,
    });
  });

  it("stores the latest comment read for a document", async () => {
    const upsert = mock(async (_contentType, _filter, data) => ({
      _id: notificationId,
      ...data,
    }));
    const db = {
      find: mock(async (contentType, filter) =>
        contentType.name === ContentComment.name
          ? {
              _id: commentId,
              contentType: CommentArticle.name,
              documentId,
            }
          : { _id: filter._id, createdBy: "someone-else" },
      ),
      upsert,
    };

    mockGetMongoService.mockResolvedValue(db);

    const result = await markCommentsReadHandler({
      input: {
        contentType: CommentArticle.name,
        documentId,
        commentId,
      },
      ctx,
    } as never);

    expect(result).toEqual({ lastReadCommentId: commentId });
    expect(upsert).toHaveBeenCalledWith(
      ContentCommentReadState,
      {
        "user._id": userId,
        contentType: CommentArticle.name,
        documentId,
      },
      {
        _type: ContentCommentReadState.name,
        user: {
          type: "existing",
          _id: userId,
          contentType: ManagerUser.name,
        },
        contentType: CommentArticle.name,
        documentId,
        lastReadCommentId: commentId,
        createdBy: userId,
        updatedBy: userId,
      },
      { actorId: userId },
    );
  });

  it("counts only unread comments written by other users", async () => {
    const db = {
      find: mock(async (contentType) =>
        contentType.name === ContentCommentReadState.name
          ? { lastReadCommentId: commentId }
          : { _id: documentId, createdBy: "someone-else" },
      ),
      list: mock(async () => ({
        totalItems: 3,
        items: [
          {
            _id: commentId,
            author: {
              _id: mentionUserId,
            },
          },
          {
            _id: notificationId,
            author: {
              _id: userId,
            },
          },
          {
            _id: unreadCommentId,
            author: {
              _id: mentionUserId,
            },
          },
        ],
      })),
    };

    mockGetMongoService.mockResolvedValue(db);

    const result = await unreadCommentsCountHandler({
      input: {
        contentType: CommentArticle.name,
        documentId,
      },
      ctx,
    } as never);

    expect(result).toEqual({ count: 1 });
  });

  it("lists mention notifications with unread state and document context", async () => {
    const db = {
      find: mock(async () => ({ _id: documentId, createdBy: "someone-else" })),
      get: mock(async () => ({ _id: documentId, title: "Article title" })),
      list: mock(async (contentType) => {
        if (contentType.name === ManagerNotification.name) {
          return {
            totalItems: 1,
            items: [
              {
                _id: notificationId,
                _type: ManagerNotification.name,
                user: {
                  type: "existing",
                  _id: userId,
                  contentType: ManagerUser.name,
                },
                author: {
                  type: "existing",
                  _id: mentionUserId,
                  contentType: ManagerUser.name,
                },
                commentId,
                contentType: CommentArticle.name,
                documentId,
                text: "Please review this",
                read: false,
                createdAt,
              },
            ],
          };
        }

        return {
          totalItems: managerUsers.length,
          items: managerUsers,
        };
      }),
    };

    mockGetMongoService.mockResolvedValue(db);

    const result = await listNotificationsHandler({
      input: undefined,
      ctx,
    } as never);

    expect(result).toEqual({
      totalUnread: 1,
      notifications: [
        {
          _id: notificationId,
          commentId,
          contentType: CommentArticle.name,
          documentId,
          title: "Article title",
          text: "Please review this",
          createdAt,
          author: {
            _id: mentionUserId,
            name: "Editor One",
            user: "editor",
            avatar: null,
          },
          read: false,
        },
      ],
    });
  });

  it("marks document mention notifications as read", async () => {
    const update = mock(async (_contentType, _id, data) => ({
      _id,
      ...data,
    }));
    const db = {
      find: mock(async () => ({ _id: documentId, createdBy: "someone-else" })),
      list: mock(async () => ({
        totalItems: 1,
        items: [
          {
            _id: notificationId,
            _type: ManagerNotification.name,
            read: false,
          },
        ],
      })),
      update,
    };

    mockGetMongoService.mockResolvedValue(db);

    const result = await markNotificationsReadHandler({
      input: {
        contentType: CommentArticle.name,
        documentId,
      },
      ctx,
    } as never);

    expect(result).toEqual({ markedRead: 1 });
    expect(update).toHaveBeenCalledWith(
      ManagerNotification,
      notificationId,
      {
        read: true,
        updatedBy: userId,
      },
      { actorId: userId },
    );
  });

  it("deletes comments when a document is permanently deleted", async () => {
    const deleteMock = mock(async () => undefined);
    const db = {
      find: mock(async () => ({ _id: documentId, createdBy: "someone-else" })),
      findDependencies: mock(async () => []),
      list: mock(async () => ({ totalItems: 0, items: [] })),
      delete: deleteMock,
    };

    mockGetMongoService.mockResolvedValue(db);

    await deleteHandler({
      input: {
        contentType: CommentArticle.name,
        id: documentId,
      },
      ctx,
    } as never);

    expect(deleteMock).toHaveBeenCalledWith(
      CommentArticle,
      { _id: documentId },
      { actorId: userId },
    );
    expect(deleteMock).toHaveBeenCalledWith(
      ContentComment,
      {
        contentType: CommentArticle.name,
        documentId,
      },
      { actorId: userId },
    );
    expect(deleteMock).toHaveBeenCalledWith(
      ContentCommentReadState,
      {
        contentType: CommentArticle.name,
        documentId,
      },
      { actorId: userId },
    );
    expect(deleteMock).toHaveBeenCalledWith(
      ManagerNotification,
      {
        contentType: CommentArticle.name,
        documentId,
      },
      { actorId: userId },
    );
  });
});
