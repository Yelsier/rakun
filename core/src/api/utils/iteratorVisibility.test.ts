import { describe, expect, it } from "bun:test";

import {
  isIteratorItemVisible,
  isIteratorVisibilityValueEmpty,
} from "./iteratorVisibility";

describe("iterator visibility", () => {
  it("evaluates empty and non-empty fields on the current document", () => {
    const item = {
      visibleWhen: {
        field: "credits",
        operator: "notEmpty" as const,
      },
    };

    expect(isIteratorItemVisible(item, { credits: "" })).toBe(false);
    expect(isIteratorItemVisible(item, { credits: "Produced by Rakun" })).toBe(
      true,
    );
    expect(isIteratorItemVisible(item, {})).toBe(false);
  });

  it("supports nested paths and the empty operator", () => {
    expect(
      isIteratorItemVisible(
        {
          visibleWhen: {
            field: "details.credits",
            operator: "empty",
          },
        },
        {
          details: {
            credits: [],
          },
        },
      ),
    ).toBe(true);
  });

  it("treats structurally empty rich text as empty", () => {
    expect(
      isIteratorVisibilityValueEmpty({
        root: {
          children: [
            {
              children: [],
              direction: null,
              format: "",
              indent: 0,
              textFormat: 0,
              textStyle: "",
              type: "paragraph",
              version: 1,
            },
          ],
          direction: null,
          format: "",
          indent: 0,
          type: "root",
          version: 1,
        },
      }),
    ).toBe(true);

    expect(
      isIteratorVisibilityValueEmpty({
        root: {
          type: "root",
          children: [
            {
              type: "paragraph",
              children: [
                { type: "text", text: "   " },
                { type: "linebreak" },
              ],
            },
          ],
        },
      }),
    ).toBe(true);

    expect(
      isIteratorVisibilityValueEmpty({
        root: {
          type: "root",
          children: [
            {
              type: "paragraph",
              children: [{ type: "text", text: "Credits" }],
            },
          ],
        },
      }),
    ).toBe(false);
  });

  it("evaluates translatable rich text across its language values", () => {
    const emptyRichText = {
      root: {
        type: "root",
        children: [{ type: "paragraph", children: [] }],
      },
    };

    expect(
      isIteratorVisibilityValueEmpty({
        _tag: "Translatable",
        en: emptyRichText,
        es: emptyRichText,
      }),
    ).toBe(true);

    expect(
      isIteratorVisibilityValueEmpty({
        _tag: "Translatable",
        en: emptyRichText,
        es: {
          root: {
            type: "root",
            children: [
              {
                type: "paragraph",
                children: [{ type: "text", text: "Créditos" }],
              },
            ],
          },
        },
      }),
    ).toBe(false);
  });

  it("treats unknown rich-text decorator nodes as content", () => {
    expect(
      isIteratorVisibilityValueEmpty({
        root: {
          type: "root",
          children: [{ type: "plugin-image", src: "/credit.jpg" }],
        },
      }),
    ).toBe(false);
  });

  it("keeps modules without a condition visible", () => {
    expect(isIteratorItemVisible({}, {})).toBe(true);
  });
});
