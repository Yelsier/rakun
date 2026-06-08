import { describe, expect, it } from "bun:test";

import ContentType from "../ContentType";
import { getContentTypesForManager, registerContentType } from "../Registry";
import { ITERATOR_FIELD_NAME, SEO_FIELD_NAME } from "../systemFields";
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

  it("adds iterator fields from content type params", () => {
    const IteratorParamCT = new ContentType({
      name: "IteratorParam",
      fields: {
        title: Fields.string().required(),
      },
      iterator: [
        {
          contentType: TypeRegressionCT,
          type: "existing",
        },
      ],
    });

    expect(IteratorParamCT.hasIterator).toBe(true);
    expect(IteratorParamCT.fields[ITERATOR_FIELD_NAME]?.meta.ui).toBe(
      "Iterator",
    );

    expect(
      IteratorParamCT.validate({
        _type: "IteratorParam",
        title: "Page",
        [ITERATOR_FIELD_NAME]: [
          {
            name: TypeRegressionCT.name,
            value: {
              type: "existing",
              _id: "64f0c0000000000000000001",
              contentType: TypeRegressionCT.name,
            },
          },
        ],
      })[ITERATOR_FIELD_NAME],
    ).toHaveLength(1);
  });

  it("rejects public fields that use reserved system fields", () => {
    expect(
      () =>
        new ContentType({
          name: "ReservedIterator",
          fields: {
            [ITERATOR_FIELD_NAME]: Fields.string(),
          },
        }),
    ).toThrow("reserved");

    expect(
      () =>
        new ContentType({
          name: "ReservedSeo",
          fields: {
            [SEO_FIELD_NAME]: Fields.string(),
          },
        }),
    ).toThrow("reserved");

    expect(
      () =>
        new ContentType({
          name: "DirectIterator",
          fields: {
            modules: Fields.iterator([
              { contentType: TypeRegressionCT, type: "existing" },
            ]),
          },
        }),
    ).toThrow("ContentType.iterator");
  });

  it("adds conditions to fields and keeps them through modifiers", () => {
    const condition = { field: "intent", equals: "x" } as const;
    const fields = [
      Fields.string(),
      Fields.select(["x", "y"] as const),
      Fields.number(),
      Fields.boolean(),
      Fields.date(),
      Fields.link(),
      Fields.file(),
      Fields.contentReference("Page"),
      Fields.selfRelation(),
      Fields.array(Fields.string()),
      Fields.blocks([{ name: "block", field: Fields.string() }]),
      Fields.iterator([{ contentType: TypeRegressionCT, type: "existing" }]),
    ];

    for (const field of fields) {
      expect(
        field.condition(condition).required().translatable().getCondition(),
      ).toEqual(condition);
    }
  });

  it("encodes field conditions for the manager", () => {
    const condition = { field: "intent", equals: "x" } as const;
    const ConditionEncodedCT = new ContentType({
      name: "ConditionEncoded",
      fields: {
        intent: Fields.select(["x", "y"] as const),
        enabled: Fields.boolean().condition(condition),
      },
    });

    registerContentType(ConditionEncodedCT);

    const encoded = getContentTypesForManager().find(
      (contentType) => contentType.name === ConditionEncodedCT.name,
    );

    expect(encoded?.fields.enabled.condition).toEqual(condition);
  });

  it("encodes field descriptions for the manager", () => {
    const DescriptionEncodedCT = new ContentType({
      name: "DescriptionEncoded",
      fields: {
        title: Fields.string().description("Shown below the field label."),
      },
    });

    registerContentType(DescriptionEncodedCT);

    const encoded = getContentTypesForManager().find(
      (contentType) => contentType.name === DescriptionEncodedCT.name,
    );

    expect(encoded?.fields.title.description).toBe(
      "Shown below the field label.",
    );
  });

  it("allows null for required fields when their condition is false", () => {
    const ConditionalRequiredCT = new ContentType({
      name: "ConditionalRequired",
      fields: {
        intent: Fields.select(["x", "y"] as const).required(),
        enabled: Fields.boolean()
          .condition({ field: "intent", equals: "x" })
          .required(),
      },
    });

    expect(
      ConditionalRequiredCT.validate({
        _type: "ConditionalRequired",
        intent: "y",
        enabled: null,
      }).enabled,
    ).toBeNull();
  });

  it("requires conditioned required fields when their condition is true", () => {
    const ConditionalRequiredCT = new ContentType({
      name: "ConditionalRequiredStrict",
      fields: {
        intent: Fields.select(["x", "y"] as const).required(),
        enabled: Fields.boolean()
          .condition({ field: "intent", equals: "x" })
          .required(),
      },
    });

    expect(() =>
      ConditionalRequiredCT.validate({
        _type: "ConditionalRequiredStrict",
        intent: "x",
        enabled: null,
      }),
    ).toThrow();
  });

  it("supports numeric conditional operators", () => {
    const NumericConditionCT = new ContentType({
      name: "NumericCondition",
      fields: {
        score: Fields.number().required(),
        enabled: Fields.boolean()
          .condition({ field: "score", gte: 10 })
          .required(),
      },
    });

    expect(
      NumericConditionCT.validate({
        _type: "NumericCondition",
        score: 9,
        enabled: null,
      }).enabled,
    ).toBeNull();

    expect(() =>
      NumericConditionCT.validate({
        _type: "NumericCondition",
        score: 10,
        enabled: null,
      }),
    ).toThrow();
  });

  it("supports list inclusion and length conditional operators", () => {
    const ListConditionCT = new ContentType({
      name: "ListCondition",
      fields: {
        tags: Fields.select(["featured", "draft", "news"] as const)
          .multiple()
          .required(),
        cta: Fields.string()
          .condition({ field: "tags", includes: "featured" })
          .required(),
        summary: Fields.string()
          .condition({ field: "tags", length: { gte: 2 } })
          .required(),
      },
    });

    expect(
      ListConditionCT.validate({
        _type: "ListCondition",
        tags: ["draft"],
        cta: null,
        summary: null,
      }).cta,
    ).toBeNull();

    expect(() =>
      ListConditionCT.validate({
        _type: "ListCondition",
        tags: ["featured"],
        cta: null,
        summary: null,
      }),
    ).toThrow();

    expect(() =>
      ListConditionCT.validate({
        _type: "ListCondition",
        tags: ["draft", "news"],
        cta: null,
        summary: null,
      }),
    ).toThrow();
  });
});
