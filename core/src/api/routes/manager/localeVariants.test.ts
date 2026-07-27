import { describe, expect, it } from "bun:test";

import ContentType from "../../../lib/ContentType";
import { Fields } from "../../../lib/fields";
import {
  LOCALE_VARIANT_GROUP_FIELD,
  LOCALE_VARIANT_NAME_FIELD,
  LOCALE_VARIANT_ROLE_FIELD,
} from "../../../lib/localeVariants";
import { cloneForLocaleVariant } from "./localeVariants";

const Page = new ContentType({
  name: "NamedVariantPage",
  fields: {
    title: Fields.string().required(),
  },
});

describe("cloneForLocaleVariant", () => {
  it("stores the new identifying name separately from the title", () => {
    const clone = cloneForLocaleVariant(
      Page,
      {
        _id: "primary-id",
        _type: Page.name,
        title: "Shared title",
        [LOCALE_VARIANT_NAME_FIELD]: "Old name",
      },
      "  Homepage redesign  ",
    );

    expect(clone.title).toBe("Shared title");
    expect(clone[LOCALE_VARIANT_GROUP_FIELD]).toBe("primary-id");
    expect(clone[LOCALE_VARIANT_NAME_FIELD]).toBe("Homepage redesign");
    expect(clone[LOCALE_VARIANT_ROLE_FIELD]).toBe("variant");
  });
});
