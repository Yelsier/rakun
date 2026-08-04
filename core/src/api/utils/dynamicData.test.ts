import { describe, expect, it, mock } from "bun:test";

import ContentType from "../../lib/ContentType";
import { Fields } from "../../lib/fields";
import { registerContentType } from "../../lib/Registry";
import type { DBService } from "../../orm/dbService";
import {
  getDynamicListItemContentTypeName,
  mergeDynamicListItems,
  resolveDynamicData,
  resolveRelatedCollectionValue,
  stripDynamicBindings,
} from "./dynamicData";

describe("dynamic data output", () => {
  it("preserves dates while resolving data and stripping bindings", async () => {
    const DateSource = new ContentType({
      name: "DynamicDateSource",
      fields: {
        publishedAt: Fields.date().type("DateTime").required(),
      },
    });
    const publishedAt = new Date("2026-08-14T16:12:00.000Z");

    const resolved = await resolveDynamicData(
      {
        _type: DateSource.name,
        publishedAt,
        nested: { publishedAt },
      },
      {
        db: {} as never,
        contentType: DateSource,
        surface: "web",
      },
    );

    expect(resolved.publishedAt).toBe(publishedAt);
    expect(resolved.nested.publishedAt).toBe(publishedAt);
    expect(
      stripDynamicBindings({ publishedAt, _bindings: {} }).publishedAt,
    ).toBe(publishedAt);
  });

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

  it("builds a nested list from an array on the current document", async () => {
    const CurrentDocumentLinkItem = new ContentType({
      name: "CurrentDocumentLinkItem",
      fields: {
        title: Fields.string().required(),
        href: Fields.string().required(),
      },
    });
    const CurrentDocumentHeader = new ContentType({
      name: "CurrentDocumentHeader",
      fields: {
        categories: Fields.blocks([
          {
            name: "Category",
            field: Fields.relation(CurrentDocumentLinkItem, "new"),
          },
        ]),
      },
    });
    const CurrentDocumentProject = new ContentType({
      name: "CurrentDocumentProject",
      fields: {
        categories: Fields.blocks([
          {
            name: "Category",
            field: Fields.relation(CurrentDocumentLinkItem, "new"),
          },
        ]),
        modules: Fields.blocks([
          {
            name: "Header",
            field: Fields.relation(CurrentDocumentHeader, "new"),
          },
        ]),
      },
    });
    registerContentType(CurrentDocumentLinkItem);
    registerContentType(CurrentDocumentHeader);

    const resolved = await resolveDynamicData(
      {
        _id: "project-1",
        _type: CurrentDocumentProject.name,
        categories: [
          {
            name: "Category",
            value: {
              _id: "category-1",
              _type: CurrentDocumentLinkItem.name,
              title: "News",
              href: "/news",
            },
          },
        ],
        modules: [
          {
            name: "Header",
            value: {
              _type: CurrentDocumentHeader.name,
              _bindings: {
                lists: {
                  categories: {
                    contentType: CurrentDocumentLinkItem.name,
                    source: {
                      kind: "currentDocument",
                      contentType: CurrentDocumentProject.name,
                      path: "categories",
                      itemName: "Category",
                    },
                    itemName: "Category",
                    map: {
                      title: {
                        contentType: CurrentDocumentLinkItem.name,
                        path: "title",
                      },
                      href: {
                        contentType: CurrentDocumentLinkItem.name,
                        path: "href",
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      {
        db: {} as never,
        contentType: CurrentDocumentProject,
        surface: "web",
      },
    );

    expect(resolved.modules[0]?.value.categories).toEqual([
      {
        name: "Category",
        value: {
          _id: "Category:category-1",
          _type: CurrentDocumentLinkItem.name,
          title: "News",
          href: "/news",
        },
      },
    ]);
  });

  it("maps lists recursively inside dynamic list items", async () => {
    const NestedSourceImage = new ContentType({
      name: "NestedDynamicSourceImage",
      fields: {
        title: Fields.string().required(),
        link: Fields.link().required(),
        image: Fields.file().type("Image").required(),
      },
    });
    const NestedSourceCategory = new ContentType({
      name: "NestedDynamicSourceCategory",
      fields: {
        title: Fields.string().required(),
        images: Fields.blocks([
          {
            name: "SourceImage",
            field: Fields.relation(NestedSourceImage, "new"),
          },
        ]),
      },
    });
    const NestedGalleryImage = new ContentType({
      name: "NestedDynamicGalleryImage",
      fields: {
        title: Fields.string().required(),
        href: Fields.string().required(),
        linkTitle: Fields.string().required(),
        image: Fields.file().type("Image").required(),
      },
    });
    const NestedGalleryItem = new ContentType({
      name: "NestedDynamicGalleryItem",
      fields: {
        title: Fields.string().required(),
        images: Fields.blocks([
          {
            name: "GalleryImage",
            field: Fields.relation(NestedGalleryImage, "new"),
          },
        ]),
      },
    });
    const NestedGallery = new ContentType({
      name: "NestedDynamicGallery",
      fields: {
        items: Fields.blocks([
          {
            name: "GalleryItem",
            field: Fields.relation(NestedGalleryItem, "new"),
          },
        ]),
      },
    });
    const NestedPage = new ContentType({
      name: "NestedDynamicPage",
      fields: {
        categories: Fields.blocks([
          {
            name: "SourceCategory",
            field: Fields.relation(NestedSourceCategory, "new"),
          },
        ]),
        modules: Fields.blocks([
          {
            name: "Gallery",
            field: Fields.relation(NestedGallery, "new"),
          },
        ]),
      },
    });
    for (const contentType of [
      NestedSourceImage,
      NestedSourceCategory,
      NestedGalleryImage,
      NestedGalleryItem,
      NestedGallery,
    ]) {
      registerContentType(contentType);
    }

    const image = { key: "aurora", url: "/aurora.webp" };
    const resolved = await resolveDynamicData(
      {
        _id: "page-1",
        _type: NestedPage.name,
        categories: [
          {
            name: "SourceCategory",
            value: {
              _id: "category-1",
              _type: NestedSourceCategory.name,
              title: "Launches",
              images: [
                {
                  name: "SourceImage",
                  value: {
                    _id: "image-1",
                    _type: NestedSourceImage.name,
                    title: "Aurora launch",
                    link: {
                      href: "/projects/aurora-launch",
                      title: "View Aurora launch",
                    },
                    image,
                  },
                },
              ],
            },
          },
        ],
        modules: [
          {
            name: "Gallery",
            value: {
              _type: NestedGallery.name,
              _bindings: {
                lists: {
                  items: {
                    contentType: NestedSourceCategory.name,
                    source: {
                      kind: "currentDocument",
                      contentType: NestedPage.name,
                      path: "categories",
                      itemName: "SourceCategory",
                    },
                    itemName: "GalleryItem",
                    map: {
                      title: {
                        contentType: NestedSourceCategory.name,
                        path: "title",
                      },
                      images: {
                        kind: "list",
                        contentType: NestedSourceImage.name,
                        source: {
                          kind: "currentDocument",
                          contentType: NestedSourceCategory.name,
                          path: "images",
                          itemName: "SourceImage",
                        },
                        itemName: "GalleryImage",
                        map: {
                          title: {
                            contentType: NestedSourceImage.name,
                            path: "title",
                          },
                          href: {
                            contentType: NestedSourceImage.name,
                            path: "link.href",
                          },
                          linkTitle: {
                            contentType: NestedSourceImage.name,
                            path: "link.title",
                          },
                          image: {
                            contentType: NestedSourceImage.name,
                            path: "image",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      {
        db: {} as never,
        contentType: NestedPage,
        surface: "web",
      },
    );

    expect(resolved.modules[0]?.value.items).toEqual([
      {
        name: "GalleryItem",
        value: {
          _id: "GalleryItem:category-1",
          _type: NestedGalleryItem.name,
          title: "Launches",
          images: [
            {
              name: "GalleryImage",
              value: {
                _id: "GalleryImage:image-1",
                _type: NestedGalleryImage.name,
                title: "Aurora launch",
                href: "/projects/aurora-launch",
                linkTitle: "View Aurora launch",
                image,
              },
            },
          ],
        },
      },
    ]);
  });

  it("resolves list query values from the current document", async () => {
    const CurrentQueryCard = new ContentType({
      name: "CurrentQueryCard",
      fields: {
        title: Fields.string(),
      },
    });
    const CurrentQueryCategory = new ContentType({
      name: "CurrentQueryCategory",
      fields: {
        title: Fields.string().required(),
        slug: Fields.string().required(),
        projects: Fields.blocks([
          {
            name: CurrentQueryCard.name,
            field: Fields.relation(CurrentQueryCard, "new"),
          },
        ]),
      },
    });
    const CurrentQueryProject = new ContentType({
      name: "CurrentQueryProject",
      dynamicDataSource: true,
      fields: {
        title: Fields.string().required(),
        category: Fields.relation(CurrentQueryCategory, "existing").required(),
        published: Fields.boolean(),
      },
    });
    registerContentType(CurrentQueryCard);
    registerContentType(CurrentQueryCategory);
    registerContentType(CurrentQueryProject);
    const list = mock(async () => ({ totalItems: 0, items: [] }));

    await resolveDynamicData(
      {
        _id: "category-1",
        _type: CurrentQueryCategory.name,
        title: "Design",
        slug: "design",
        projects: [],
        _bindings: {
          lists: {
            projects: {
              contentType: CurrentQueryProject.name,
              itemName: CurrentQueryCard.name,
              query: {
                filter: {
                  $and: [
                    { "category.slug": { $current: "slug" } },
                    { published: true },
                  ],
                },
                options: { limit: 10 },
              },
              map: {},
            },
          },
        },
      },
      {
        db: { list } as unknown as DBService,
        contentType: CurrentQueryCategory,
        surface: "web",
      },
    );

    expect(list).toHaveBeenCalledWith(CurrentQueryProject, {
      filter: {
        $and: [
          { "category.slug": "design" },
          { published: true },
        ],
        _trashed: { $ne: true },
        _visibility: { $nin: ["draft", "trash"] },
      },
      options: {
        fields: undefined,
        limit: 10,
        page: undefined,
        sort: undefined,
      },
    });
  });

  it("resolves nested list queries from the current item and root document", async () => {
    const NestedQueryCard = new ContentType({
      name: "NestedQueryCard",
      fields: {
        title: Fields.string(),
      },
    });
    const NestedQueryGroup = new ContentType({
      name: "NestedQueryGroup",
      fields: {
        title: Fields.string(),
        projects: Fields.blocks([
          {
            name: NestedQueryCard.name,
            field: Fields.relation(NestedQueryCard, "new"),
          },
        ]),
      },
    });
    const NestedQueryCategory = new ContentType({
      name: "NestedQueryCategory",
      dynamicDataSource: true,
      fields: {
        title: Fields.string(),
      },
    });
    const NestedQueryPage = new ContentType({
      name: "NestedQueryPage",
      fields: {
        site: Fields.string(),
        categories: Fields.blocks([
          {
            name: NestedQueryCategory.name,
            field: Fields.relation(NestedQueryCategory, "new"),
          },
        ]),
        groups: Fields.blocks([
          {
            name: NestedQueryGroup.name,
            field: Fields.relation(NestedQueryGroup, "new"),
          },
        ]),
      },
    });
    const NestedQueryProject = new ContentType({
      name: "NestedQueryProject",
      dynamicDataSource: true,
      fields: {
        title: Fields.string(),
        site: Fields.string(),
        category: Fields.relation(NestedQueryCategory, "existing"),
      },
    });
    for (const contentType of [
      NestedQueryCard,
      NestedQueryGroup,
      NestedQueryCategory,
      NestedQueryProject,
    ]) {
      registerContentType(contentType);
    }

    const list = mock(async () => ({ totalItems: 0, items: [] }));

    const resolved = await resolveDynamicData(
      {
        _id: "page-1",
        _type: NestedQueryPage.name,
        site: "agency",
        categories: [
          {
            name: NestedQueryCategory.name,
            value: {
              _id: "category-1",
              _type: NestedQueryCategory.name,
              title: "Design",
            },
          },
        ],
        groups: [],
        _bindings: {
          lists: {
            groups: {
              contentType: NestedQueryCategory.name,
              source: {
                kind: "currentDocument",
                contentType: NestedQueryPage.name,
                path: "categories",
                itemName: NestedQueryCategory.name,
              },
              itemName: NestedQueryGroup.name,
              map: {
                title: {
                  contentType: NestedQueryCategory.name,
                  path: "title",
                },
                projects: {
                  kind: "list",
                  contentType: NestedQueryProject.name,
                  itemName: NestedQueryCard.name,
                  query: {
                    filter: {
                      $and: [
                        { "category._id": { $current: "_id" } },
                        { site: { $document: "site" } },
                      ],
                    },
                    options: { limit: 10 },
                  },
                  map: {
                    title: {
                      contentType: NestedQueryProject.name,
                      path: "title",
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        db: { list } as unknown as DBService,
        contentType: NestedQueryPage,
        surface: "web",
      },
    );

    expect(list).toHaveBeenCalledWith(NestedQueryProject, {
      filter: {
        $and: [
          { "category._id": "category-1" },
          { site: "agency" },
        ],
        _trashed: { $ne: true },
        _visibility: { $nin: ["draft", "trash"] },
      },
      options: {
        fields: undefined,
        limit: 10,
        page: undefined,
        sort: undefined,
      },
    });
    expect(resolved.groups[0]?.value.title).toBe("Design");
  });

  it("uses the relation content type as _type when a block name is an alias", () => {
    const AliasedBlock = new ContentType({
      name: "AliasedDynamicBlock",
      fields: {
        title: Fields.string(),
      },
    });
    const AliasedBlockContainer = new ContentType({
      name: "AliasedDynamicBlockContainer",
      fields: {
        modules: Fields.blocks([
          {
            name: "hero",
            field: Fields.relation(AliasedBlock, "new"),
          },
        ]),
      },
    });

    expect(
      getDynamicListItemContentTypeName(
        AliasedBlockContainer.fields.modules,
        "hero",
      ),
    ).toBe(AliasedBlock.name);
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

  it("drops invalid fallback values and normalizes generated stable ids", () => {
    const dynamicItem = {
      name: "Category",
      value: {
        _id: "Category:category-1",
        _type: "LinkItem",
        title: "Assistant",
      },
    };
    const rawSourceDocument = {
      _id: "category-1",
      _type: "Category",
      title: "Assistant",
    };
    const wrappedSourceDocument = {
      name: "Category",
      value: rawSourceDocument,
    };

    expect(
      mergeDynamicListItems(
        [rawSourceDocument, wrappedSourceDocument],
        [dynamicItem],
      ),
    ).toEqual([dynamicItem]);
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
