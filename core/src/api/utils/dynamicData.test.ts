import { describe, expect, it } from "bun:test";

import ContentType from "../../lib/ContentType";
import { Fields } from "../../lib/fields";
import { registerContentType } from "../../lib/Registry";
import { mergeDynamicListItems, resolveDynamicData } from "./dynamicData";

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
});
