import { describe, expect, it } from "bun:test";

import { filterNestedVisibleIteratorItems } from "./page";

describe("web page nested iterator filtering", () => {
  it("preserves dates inside nested iterator values", () => {
    const publishedAt = new Date("2026-08-14T16:12:00.000Z");
    const value = {
      useCases: [
        {
          name: "UseCase",
          value: { publishedAt },
        },
      ],
    };

    const filtered = filterNestedVisibleIteratorItems(
      value,
      () => true,
    ) as typeof value;

    expect(filtered.useCases[0]?.value.publishedAt).toBe(publishedAt);
  });
});
