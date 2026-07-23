import { describe, expect, it } from "bun:test";

import {
  DynamicDocumentBindingsSchema,
  DynamicQueryCurrentValueSchema,
  isDynamicDataSourceContentTypeAllowed,
} from "./dynamicData";

describe("dynamic data", () => {
  it("hides content types from source selectors until they opt in to export", () => {
    expect(
      isDynamicDataSourceContentTypeAllowed({ name: "Project" }),
    ).toBe(false);
    expect(
      isDynamicDataSourceContentTypeAllowed({
        name: "Project",
        dynamicDataSource: true,
      }),
    ).toBe(true);
  });

  it("accepts direct and related collection list mapping sources", () => {
    const parsed = DynamicDocumentBindingsSchema.parse({
      lists: {
        items: {
          contentType: "Category",
          itemName: "CategoriesGalleryItem",
          map: {
            title: {
              contentType: "Category",
              path: "title",
            },
            images: {
              kind: "relatedCollection",
              contentType: "Project",
              relation: "category",
              path: "images",
              limit: 12,
              sort: { title: "asc" },
            },
          },
        },
      },
    });

    expect(parsed.lists?.items?.map.title).toEqual({
      contentType: "Category",
      path: "title",
    });
    expect(parsed.lists?.items?.map.images).toEqual({
      kind: "relatedCollection",
      contentType: "Project",
      relation: "category",
      path: "images",
      limit: 12,
      sort: { title: "asc" },
    });
  });

  it("accepts current-document query value references", () => {
    expect(DynamicQueryCurrentValueSchema.parse({ $current: "slug" })).toEqual({
      $current: "slug",
    });
    expect(
      DynamicQueryCurrentValueSchema.safeParse({
        $current: "slug",
        unsafe: true,
      }).success,
    ).toBe(false);
  });

  it("rejects related collection limits outside the safe range", () => {
    const binding = (limit: number) => ({
      lists: {
        items: {
          contentType: "Category",
          itemName: "CategoriesGalleryItem",
          map: {
            images: {
              kind: "relatedCollection",
              contentType: "Project",
              relation: "category",
              path: "images",
              limit,
            },
          },
        },
      },
    });

    expect(DynamicDocumentBindingsSchema.safeParse(binding(0)).success).toBe(
      false,
    );
    expect(DynamicDocumentBindingsSchema.safeParse(binding(101)).success).toBe(
      false,
    );
  });
});
