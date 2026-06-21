import z from "zod";

export const favoriteReferenceInput = z.object({
  contentType: z.string().min(1),
  documentId: z.string().min(1),
});

export const listFavoritesInput = favoriteReferenceInput.partial().optional();

export const favoriteUpdatedBy = z
  .object({
    _id: z.string(),
    user: z.string().optional(),
    email: z.string().optional(),
  })
  .nullable();

export const favoriteItem = z.object({
  contentType: z.string(),
  documentId: z.string(),
  title: z.any().optional(),
  updatedAt: z.date().optional(),
  updatedBy: favoriteUpdatedBy,
});

export const listFavoritesOutput = z.object({
  favorites: z.array(favoriteItem),
});

export const toggleFavoriteInput = favoriteReferenceInput.extend({
  favorite: z.boolean().optional(),
});

export const toggleFavoriteOutput = z.object({
  favorite: z.boolean(),
  favorites: z.array(favoriteItem),
});

export type ListFavoritesInput = z.infer<typeof listFavoritesInput>;
export type ListFavoritesOutput = z.infer<typeof listFavoritesOutput>;
export type ToggleFavoriteInput = z.infer<typeof toggleFavoriteInput>;
export type ToggleFavoriteOutput = z.infer<typeof toggleFavoriteOutput>;
