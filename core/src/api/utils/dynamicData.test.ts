import { describe, expect, it, mock } from "bun:test";

import ContentType from "../../lib/ContentType";
import { Fields } from "../../lib/fields";
import { registerContentType } from "../../lib/Registry";
import type { DBService } from "../../orm/dbService";
import {
  mergeDynamicListItems,
  resolveDynamicData,
  resolveRelatedCollectionValue,
} from "./dynamicData";

describe("dynamic data output", () => {
  it("does not resolve field bindings from the same root document", async () => {
    const SelfDynamicDataCT = new ContentType({
      name: "SelfDynamicData",
      fields: {
        title: Fields.string().required(),
        eyebrow: Fields.string(),
      },
    });

    const resolved = await resolveDynamicData(
      {
        _id: "64f0c0000000000000000001",
        _type: SelfDynamicDataCT.name,
        title: "Current title",
        _bindings: {
          fields: {
            eyebrow: {
              contentType: SelfDynamicDataCT.name,
              path: "title",
            },
          },
        },
      },
      {
        db: {} as never,
        contentType: SelfDynamicDataCT,
        surface: "web",
      },
    );

    expect(resolved.eyebrow).toBeUndefined();
  });

  it("resolves nested module bindings from the parent document", async () => {
    const ParentDynamicHeroCT = new ContentType({
      name: "ParentDynamicHero",
      fields: {
        eyebrow: Fields.string(),
      },
    });
    const ParentDynamicPageCT = new ContentType({
      name: "ParentDynamicPage",
      fields: {
        title: Fields.string().required(),
        slug: Fields.string().required(),
        modules: Fields.blocks([
          {
            name: ParentDynamicHeroCT.name,
            field: Fields.relation(ParentDynamicHeroCT, "new"),
          },
        ]),
      },
    });
    registerContentType(ParentDynamicHeroCT);

    const resolved = await resolveDynamicData(
      {
        _id: "64f0c0000000000000000002",
        _type: ParentDynamicPageCT.name,
        title: "Parent title",
        slug: "parent-title",
        modules: [
          {
            name: ParentDynamicHeroCT.name,
            value: {
              _type: ParentDynamicHeroCT.name,
              _bindings: {
                fields: {
                  eyebrow: {
                    contentType: ParentDynamicPageCT.name,
                    path: "title",
                  },
                },
              },
            },
          },
        ],
      },
      {
        db: {} as never,
        contentType: ParentDynamicPageCT,
        surface: "web",
      },
    );

    expect(resolved.modules[0]?.value.eyebrow).toBe("Parent title");
  });

  it("merges dynamic list items with manually stored items", () => {
    const dynamicItem = {
      name: "CarouselItem",
      value: {
        _id: "CarouselItem:project-1",
        _type: "CarouselItem",
        title: "Dynamic project",
      },
    };
    const manualItem = {
      name: "CarouselItem",
      value: {
        _id: "manual-1",
        _type: "CarouselItem",
        title: "Manual item",
      },
    };

    expect(mergeDynamicListItems([manualItem], [dynamicItem])).toEqual([
      dynamicItem,
      manualItem,
    ]);
  });

  it("keeps raw manual new-relation list items", () => {
    const dynamicItem = {
      name: "CarouselItem",
      value: {
        _id: "CarouselItem:project-1",
        _type: "CarouselItem",
        title: "Dynamic project",
      },
    };
    const manualItem = {
      name: "CarouselItem",
      value: {
        type: "new",
        data: {
          _type: "CarouselItem",
          title: "Manual item",
        },
      },
    };

    expect(mergeDynamicListItems([manualItem], [dynamicItem])).toEqual([
      dynamicItem,
      manualItem,
    ]);
  });

  it("does not duplicate list items with the same stable id", () => {
    const dynamicItem = {
      name: "CarouselItem",
      value: {
        _id: "CarouselItem:project-1",
        _type: "CarouselItem",
        title: "Dynamic project",
      },
    };
    const storedCopy = {
      name: "CarouselItem",
      value: {
        _id: "CarouselItem:project-1",
        _type: "CarouselItem",
        title: "Old dynamic project",
      },
    };

    expect(mergeDynamicListItems([storedCopy], [dynamicItem])).toEqual([
      dynamicItem,
    ]);
  });

  it("collects and flattens related arrays while preserving order and duplicates", async () => {
    const RelatedCategory = new ContentType({
      name: "RelatedDynamicCategory",
      dynamicDataSource: true,
      fields: {
        title: Fields.string().required(),
      },
    });
    const RelatedProject = new ContentType({
      name: "RelatedDynamicProject",
      dynamicDataSource: true,
      fields: {
        title: Fields.string().required(),
        category: Fields.relation(RelatedCategory, "existing").required(),
        images: Fields.file().type("Image").multiple().required(),
      },
    });
    registerContentType(RelatedCategory);
    registerContentType(RelatedProject);

    const repeatedImage = { key: "shared", url: "/shared.webp" };
    const list = mock(async () => ({
      totalItems: 2,
      items: [
        {
          _id: "project-1",
          _type: RelatedProject.name,
          title: "First",
          images: [
            { key: "first", url: "/first.webp" },
            repeatedImage,
          ],
        },
        {
          _id: "project-2",
          _type: RelatedProject.name,
          title: "Second",
          images: [repeatedImage, { key: "last", url: "/last.webp" }],
        },
      ],
    }));

    const resolved = await resolveRelatedCollectionValue({
      db: { list } as unknown as DBService,
      source: {
        kind: "relatedCollection",
        contentType: RelatedProject.name,
        relation: "category",
        path: "images",
        limit: 20,
        sort: { title: "asc" },
      },
      currentSource: {
        _id: "category-1",
        _type: RelatedCategory.name,
        title: "Category",
      },
      currentContentType: RelatedCategory,
      populateDocument: async (item) => item as Record<string, unknown>,
    });

    expect(resolved).toEqual([
      { key: "first", url: "/first.webp" },
      repeatedImage,
      repeatedImage,
      { key: "last", url: "/last.webp" },
    ]);
    expect(list).toHaveBeenCalledWith(RelatedProject, {
      filter: {
        "category._id": "category-1",
        _trashed: { $ne: true },
        _visibility: { $nin: ["draft", "trash"] },
      },
      options: {
        fields: undefined,
        limit: 20,
        page: undefined,
        sort: { title: "asc" },
      },
    });
  });

  it("supports multiple relations and returns an empty array without matches", async () => {
    const RelatedCategory = new ContentType({
      name: "MultipleRelatedDynamicCategory",
      dynamicDataSource: true,
      fields: { title: Fields.string().required() },
    });
    const RelatedProject = new ContentType({
      name: "MultipleRelatedDynamicProject",
      dynamicDataSource: true,
      fields: {
        categories: Fields.relation(
          RelatedCategory,
          "existing",
        ).multiple(),
        images: Fields.file().type("Image").multiple(),
      },
    });
    registerContentType(RelatedCategory);
    registerContentType(RelatedProject);
    const list = mock(async () => ({ totalItems: 0, items: [] }));

    const resolved = await resolveRelatedCollectionValue({
      db: { list } as unknown as DBService,
      source: {
        kind: "relatedCollection",
        contentType: RelatedProject.name,
        relation: "categories",
        path: "images",
        limit: 10,
      },
      currentSource: { _id: "category-2" },
      currentContentType: RelatedCategory,
      populateDocument: async (item) => item as Record<string, unknown>,
    });

    expect(resolved).toEqual([]);
  });

  it("rejects unrelated fields and non-array source paths", async () => {
    const RelatedCategory = new ContentType({
      name: "RejectedRelatedDynamicCategory",
      dynamicDataSource: true,
      fields: { title: Fields.string().required() },
    });
    const OtherCategory = new ContentType({
      name: "RejectedRelatedDynamicOther",
      dynamicDataSource: true,
      fields: { title: Fields.string().required() },
    });
    const RelatedProject = new ContentType({
      name: "RejectedRelatedDynamicProject",
      dynamicDataSource: true,
      fields: {
        title: Fields.string().required(),
        category: Fields.relation(RelatedCategory, "existing"),
        otherCategory: Fields.relation(OtherCategory, "existing"),
        images: Fields.file().type("Image").multiple(),
      },
    });
    registerContentType(RelatedCategory);
    registerContentType(OtherCategory);
    registerContentType(RelatedProject);
    const list = mock(async () => ({ totalItems: 0, items: [] }));
    const base = {
      db: { list } as unknown as DBService,
      currentSource: { _id: "category-3" },
      currentContentType: RelatedCategory,
      populateDocument: async (item: unknown) =>
        item as Record<string, unknown>,
    };

    expect(
      await resolveRelatedCollectionValue({
        ...base,
        source: {
          kind: "relatedCollection",
          contentType: RelatedProject.name,
          relation: "otherCategory",
          path: "images",
          limit: 10,
        },
      }),
    ).toBeUndefined();
    expect(
      await resolveRelatedCollectionValue({
        ...base,
        source: {
          kind: "relatedCollection",
          contentType: RelatedProject.name,
          relation: "category",
          path: "title",
          limit: 10,
        },
      }),
    ).toBeUndefined();
    expect(list).not.toHaveBeenCalled();
  });
});
