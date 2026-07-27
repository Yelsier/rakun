import { describe, expect, it } from "bun:test";

import { createContentVersionInput } from "./contentVersions";
import { localeVariantCreateInput } from "./localeVariants";

describe("locale variant creation schemas", () => {
  const reference = {
    contentType: "Page",
    documentId: "document-id",
  };

  it("requires a non-empty identifying name in both creation flows", () => {
    expect(
      createContentVersionInput.safeParse(reference).success,
    ).toBeFalse();
    expect(
      localeVariantCreateInput.safeParse({
        ...reference,
        name: "   ",
      }).success,
    ).toBeFalse();
  });

  it("trims the identifying name", () => {
    const contentVersion = createContentVersionInput.parse({
      ...reference,
      name: "  Homepage redesign  ",
    });
    const localeVariant = localeVariantCreateInput.parse({
      ...reference,
      name: "  Campaign  ",
    });

    expect(contentVersion.name).toBe("Homepage redesign");
    expect(localeVariant.name).toBe("Campaign");
  });
});
