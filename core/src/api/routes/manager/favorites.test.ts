import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockGetMongoService = mock();

mock.module("../../../orm", () => ({
  getMongoService: mockGetMongoService,
}));

import ContentType from "../../../lib/ContentType";
import { Fields } from "../../../lib/fields";
import { createLogger } from "../../../lib/Logger";
import { registerContentType } from "../../../lib/Registry";
import { ManagerFavorite, ManagerUser } from "../../../internal-content-types";

const {
  listFavoritesHandler,
  toggleFavoriteHandler,
} = await import("./favorites");

const FavoriteArticle = new ContentType({
  name: "FavoriteArticle",
  fields: {
    title: Fields.string().translatable(),
  },
  listFields: ["title"],
});

registerContentType(FavoriteArticle);

const userId = "507f1f77bcf86cd799439011";
const documentId = "507f1f77bcf86cd799439012";
const favoriteId = "507f1f77bcf86cd799439013";
const updatedAt = new Date("2026-06-15T10:00:00.000Z");

const ctx = {
  getUser: () => ({
    _id: userId,
    _type: "ManagerUser",
    user: "Yago",
    email: "yago@example.com",
    role: { permissions: ["content.FavoriteArticle.readAny"] },
  }),
};

describe("manager favorites", () => {
  beforeEach(() => {
    createLogger({ level: "fatal" });
    mockGetMongoService.mockReset();
  });

  it("lists current user favorites with document metadata", async () => {
    const db = {
      list: mock(async () => ({
        totalItems: 1,
        items: [
          {
            _id: favoriteId,
            _type: ManagerFavorite.name,
            user: {
              type: "existing",
              _id: userId,
              contentType: ManagerUser.name,
            },
            contentType: FavoriteArticle.name,
            documentId,
          },
        ],
      })),
      find: mock(async () => ({ createdBy: "other-user" })),
      get: mock(async (contentType) =>
        contentType.name === ManagerUser.name
          ? {
              _id: userId,
              _type: ManagerUser.name,
              user: "Yago",
              email: "yago@example.com",
            }
          : {
              _id: documentId,
              _type: FavoriteArticle.name,
              title: { _tag: "Translatable", en: "Hello" },
              updatedAt,
              updatedBy: userId,
            },
      ),
    };

    mockGetMongoService.mockResolvedValue(db);

    const result = await listFavoritesHandler({
      input: undefined,
      ctx,
    } as never);

    expect(result).toEqual({
      favorites: [
        {
          contentType: FavoriteArticle.name,
          documentId,
          title: { _tag: "Translatable", en: "Hello" },
          updatedAt,
          updatedBy: {
            _id: userId,
            user: "Yago",
            email: "yago@example.com",
          },
        },
      ],
    });
  });

  it("creates a favorite when toggled on", async () => {
    const create = mock(async () => ({
      _id: favoriteId,
      _type: ManagerFavorite.name,
    }));
    const db = {
      find: mock(async (contentType) =>
        contentType.name === FavoriteArticle.name
          ? { createdBy: "other-user" }
          : null,
      ),
      create,
      delete: mock(async () => undefined),
      list: mock(async () => ({
        totalItems: 1,
        items: [
          {
            _id: favoriteId,
            _type: ManagerFavorite.name,
            user: {
              type: "existing",
              _id: userId,
              contentType: ManagerUser.name,
            },
            contentType: FavoriteArticle.name,
            documentId,
          },
        ],
      })),
      get: mock(async (contentType) =>
        contentType.name === ManagerUser.name
          ? {
              _id: userId,
              _type: ManagerUser.name,
              user: "Yago",
              email: "yago@example.com",
            }
          : {
              _id: documentId,
              _type: FavoriteArticle.name,
              title: { _tag: "Translatable", en: "Hello" },
              updatedAt,
              updatedBy: userId,
            },
      ),
    };

    mockGetMongoService.mockResolvedValue(db);

    const result = await toggleFavoriteHandler({
      input: {
        contentType: FavoriteArticle.name,
        documentId,
        favorite: true,
      },
      ctx,
    } as never);

    expect(create).toHaveBeenCalledWith(
      ManagerFavorite,
      {
        user: {
          type: "existing",
          _id: userId,
          contentType: ManagerUser.name,
        },
        contentType: FavoriteArticle.name,
        documentId,
        _type: ManagerFavorite.name,
        createdBy: userId,
        updatedBy: userId,
      },
      { actorId: userId },
    );
    expect(result.favorite).toBe(true);
  });
});
