import { describe, expect, it } from "bun:test";

import { isCompatibleMediaUploadKey } from "./mediaUploadKey";

describe("isCompatibleMediaUploadKey", () => {
  it("accepts exact matches", () => {
    expect(
      isCompatibleMediaUploadKey(
        "public/uploads/a.png",
        "public/uploads/a.png",
      ),
    ).toBe(true);
  });

  it("accepts optimized extension rewrites in the same folder", () => {
    expect(
      isCompatibleMediaUploadKey(
        "public/uploads/2026-08-06/hero.png",
        "public/uploads/2026-08-06/hero.webp",
      ),
    ).toBe(true);
  });

  it("rejects unrelated keys", () => {
    expect(
      isCompatibleMediaUploadKey(
        "public/uploads/hero.png",
        "public/uploads/other.webp",
      ),
    ).toBe(false);
    expect(
      isCompatibleMediaUploadKey(
        "public/uploads/hero.png",
        "private/uploads/hero.webp",
      ),
    ).toBe(false);
  });
});
