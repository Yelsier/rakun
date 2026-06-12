import { describe, expect, it } from "bun:test";

import { mergeDynamicListItems } from "./dynamicData";

describe("dynamic data output", () => {
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
