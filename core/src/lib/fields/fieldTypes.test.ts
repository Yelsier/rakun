import { describe, expect, it } from "bun:test";

import ContentType from "../ContentType";
import { Fields } from "./index";
import type { DataInput } from "../types";

const TypeRegressionCT = new ContentType({
  name: "TypeRegression",
  fields: {
    slug: Fields.string().translatable().required(),
  },
});

type TypeRegressionInput = DataInput<typeof TypeRegressionCT>;

const _singleWrappedSlug: TypeRegressionInput["slug"] = {
  _tag: "Translatable",
  en: "hello",
};

const _nestedSlugIsRejected: TypeRegressionInput["slug"] = {
  _tag: "Translatable",
  // @ts-expect-error Translatable fields should not be wrapped twice.
  en: {
    _tag: "Translatable",
    en: "hello",
  },
};

describe("field type inference", () => {
  it("keeps translatable string fields runtime-compatible", () => {
    expect(
      TypeRegressionCT.getInputSchema().parse({
        _type: "TypeRegression",
        slug: _singleWrappedSlug,
      }).slug,
    ).toEqual(_singleWrappedSlug);
  });
});
