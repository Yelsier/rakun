import { ManagerFavorite, ManagerUser } from "../../../internal-content-types";
import { getContentTypeByName } from "../../../lib/Registry";
import { getMongoService } from "../../../orm";
import type { RakunRequestContext } from "../../context";
import { checkOwnership } from "../../utils/checkOwnership";
import { requireContentType } from "../../utils/requireContentType";
import type {
  ListFavoritesInput,
  ListFavoritesOutput,
  ToggleFavoriteInput,
  ToggleFavoriteOutput,
} from "../../../schemas/manager/favorites";

type FavoriteDocument = {
  contentType: string;
  documentId: string;
};

const favoriteFilter = ({
  userId,
  contentType,
  documentId,
}: {
  userId: string;
  contentType?: string;
  documentId?: string;
}) => ({
  "user._id": userId,
  ...(contentType ? { contentType } : {}),
  ...(documentId ? { documentId } : {}),
});

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

const resolveUpdatedBy = async (updatedBy: unknown) => {
  if (typeof updatedBy !== "string") return null;

  const db = await getMongoService();
  const user = await db.get(ManagerUser, updatedBy, ["user", "email"]).catch(() => null);

  if (!user) return null;

  return {
    _id: user._id,
    user: user.user,
    email: user.email,
  };
};

const resolveFavorite = async ({
  ctx,
  favorite,
}: {
  ctx: RakunRequestContext;
  favorite: FavoriteDocument;
}): Promise<ListFavoritesOutput["favorites"][number] | null> => {
  const contentType = getContentTypeByName(favorite.contentType);

  if (!contentType) return null;

  try {
    await checkOwnership({
      ctx,
      contentType,
      id: favorite.documentId,
      permission: "readAny",
    });

    const titleField = contentType.listFields?.[0];
    const fields = Array.from(
      new Set([...(titleField ? [titleField] : []), "updatedAt", "updatedBy"]),
    );
    const document = (await (await getMongoService()).get(
      contentType,
      favorite.documentId,
      fields,
    )) as Record<string, unknown>;

    return {
      contentType: favorite.contentType,
      documentId: favorite.documentId,
      title: getNestedValue(document, titleField),
      updatedAt: document.updatedAt instanceof Date ? document.updatedAt : undefined,
      updatedBy: await resolveUpdatedBy(document.updatedBy),
    };
  } catch (_) {
    return null;
  }
};

export const listFavoritesHandler = async ({
  input,
  ctx,
}: {
  input: ListFavoritesInput;
  ctx: RakunRequestContext;
}): Promise<ListFavoritesOutput> => {
  const db = await getMongoService();
  const user = ctx.getUser();
  const favorites = (
    await db.list(ManagerFavorite, {
      filter: favoriteFilter({
        userId: user._id,
        contentType: input?.contentType,
        documentId: input?.documentId,
      }),
      options: {
        limit: "all",
        sort: { createdAt: "desc" } as never,
      },
    })
  ).items;

  const resolved = await Promise.all(
    favorites.map((favorite) =>
      resolveFavorite({
        ctx,
        favorite: {
          contentType: favorite.contentType,
          documentId: favorite.documentId,
        },
      }),
    ),
  );

  return {
    favorites: resolved.filter(
      (favorite): favorite is ListFavoritesOutput["favorites"][number] =>
        Boolean(favorite),
    ),
  };
};

export const toggleFavoriteHandler = async ({
  input,
  ctx,
}: {
  input: ToggleFavoriteInput;
  ctx: RakunRequestContext;
}): Promise<ToggleFavoriteOutput> => {
  const db = await getMongoService();
  const user = ctx.getUser();
  const contentType = requireContentType(input.contentType);

  await checkOwnership({
    ctx,
    contentType,
    id: input.documentId,
    permission: "readAny",
  });

  const filter = favoriteFilter({
    userId: user._id,
    contentType: input.contentType,
    documentId: input.documentId,
  });
  const existing = await db.find(ManagerFavorite, filter);
  const nextFavorite = input.favorite ?? !existing;

  if (nextFavorite && !existing) {
    await db.create(
      ManagerFavorite,
      {
        user: {
          type: "existing",
          _id: user._id,
          contentType: ManagerUser.name,
        },
        contentType: input.contentType,
        documentId: input.documentId,
        _type: ManagerFavorite.name,
        createdBy: user._id,
        updatedBy: user._id,
      },
      { actorId: user._id },
    );
  }

  if (!nextFavorite && existing) {
    await db.delete(
      ManagerFavorite,
      {
        _id: existing._id,
      },
      { actorId: user._id },
    );
  }

  const result = await listFavoritesHandler({
    input: {
      contentType: input.contentType,
      documentId: input.documentId,
    },
    ctx,
  });

  return {
    favorite: result.favorites.length > 0,
    favorites: result.favorites,
  };
};
