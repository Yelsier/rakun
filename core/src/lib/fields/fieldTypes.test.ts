import { describe, expect, it } from "bun:test";

import ContentType from "../ContentType";
import {
  encodeContentTypeForManager,
  getContentTypesForManager,
  registerContentType,
} from "../Registry";
import {
  ITERATOR_FIELD_NAME,
  SEO_FIELD_NAME,
  TEMPLATE_FIELD_NAME,
} from "../systemFields";
import { Fields, f } from "./index";
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
  it("exports f as the concise Fields alias", () => {
    expect(f).toBe(Fields);
  });

  it("keeps translatable string fields runtime-compatible", () => {
    expect(
      TypeRegressionCT.getInputSchema().parse({
        _type: "TypeRegression",
        slug: _singleWrappedSlug,
      }).slug,
    ).toEqual(_singleWrappedSlug);
  });

  it("accepts direct URLs and internal route references in link fields", () => {
    const link = Fields.link().required();

    expect(link.getInputSchema().parse("https://example.com/docs")).toBe(
      "https://example.com/docs",
    );
    expect(
      link.getInputSchema().parse({
        routeId: "64f0c0000000000000000001",
        contentTypeId: "64f0c0000000000000000002",
        title: "Documentation",
      }),
    ).toEqual({
      routeId: "64f0c0000000000000000001",
      contentTypeId: "64f0c0000000000000000002",
      title: "Documentation",
    });
    expect(
      link.getInputSchema().parse({
        href: "https://example.com/docs",
        title: "Documentation",
      }),
    ).toEqual({
      href: "https://example.com/docs",
      title: "Documentation",
    });
    expect(
      link.getOutputSchema().parse({
        href: "/docs/",
        title: "Documentation",
      }),
    ).toEqual({ href: "/docs/", title: "Documentation" });
    expect(link.getOutputSchema().parse("/legacy-docs/")).toEqual({
      href: "/legacy-docs/",
      title: "",
    });
    expect(link.getInputSchema().safeParse("").success).toBe(false);
  });

  it("normalizes serialized date inputs and keeps persisted dates strict", () => {
    const serializedDate = "2026-08-06T00:00:00.000Z";
    const serializedDateTime = "2026-08-15T15:58:00.000Z";
    const date = Fields.date().type("Date").required();
    const dateTime = Fields.date().type("DateTime").required();
    const time = Fields.date().type("Time").required();

    expect(date.getInputSchema().parse(serializedDate)).toEqual(
      new Date(serializedDate),
    );
    expect(dateTime.getInputSchema().parse(serializedDateTime)).toEqual(
      new Date(serializedDateTime),
    );
    expect(time.getInputSchema().parse("17:59:46")).toBe("17:59:46");

    expect(date.getSchema().safeParse(serializedDate).success).toBe(false);
    expect(dateTime.getSchema().safeParse(serializedDateTime).success).toBe(
      false,
    );
    expect(date.getInputSchema().safeParse("2026-08-06").success).toBe(false);
    expect(time.getInputSchema().safeParse("not-a-time").success).toBe(false);
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
            visibleWhen: {
              field: "title",
              operator: "notEmpty",
            },
          },
        ],
      })[ITERATOR_FIELD_NAME]?.[0]?.visibleWhen,
    ).toEqual({
      field: "title",
      operator: "notEmpty",
    });

    expect(() =>
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
            visibleWhen: {
              field: "title",
              operator: "unknown",
            },
          },
        ],
      }),
    ).toThrow();
  });

  it("enables templates from an iterator and encodes the same modules", () => {
    const InvalidTemplate = new ContentType({
      name: "InvalidTemplate",
      fields: {},
    });
    expect(() => InvalidTemplate.enableTemplate()).toThrow(
      "require ContentType.iterator",
    );

    const TemplateCT = new ContentType({
      name: "TemplateParam",
      fields: {},
      iterator: [
        {
          contentType: TypeRegressionCT,
          type: "new",
        },
      ],
    }).enableTemplate();

    const encoded = encodeContentTypeForManager(TemplateCT);
    expect(TemplateCT.hasTemplate).toBe(true);
    expect(encoded.hasTemplate).toBe(true);
    expect(encoded.templateField).toBeDefined();
    expect(
      (encoded.templateField as { fields: Array<{ name: string }> }).fields.map(
        (entry) => entry.name,
      ),
    ).toContain(TypeRegressionCT.name);
    expect(TemplateCT.apiOnly().hasTemplate).toBe(true);
  });

  it("allows new iterator modules to be saved as existing relations", () => {
    const IteratorParamCT = new ContentType({
      name: "IteratorNewToExisting",
      fields: {
        title: Fields.string().required(),
      },
      iterator: [
        {
          contentType: TypeRegressionCT,
          type: "new",
        },
      ],
    });

    expect(
      IteratorParamCT.validate({
        _type: "IteratorNewToExisting",
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
      })[ITERATOR_FIELD_NAME]?.[0]?.value.type,
    ).toBe("existing");
  });

  it("allows required fields to be supplied by dynamic bindings", () => {
    const DynamicBindingCT = new ContentType({
      name: "DynamicBindingCT",
      fields: {
        title: Fields.string().required(),
      },
    });

    expect(
      DynamicBindingCT.validate({
        _type: "DynamicBindingCT",
        _bindings: {
          fields: {
            title: {
              contentType: "Article",
              id: "64f0c0000000000000000001",
              path: "title",
            },
          },
        },
      })._bindings?.fields?.title?.path,
    ).toBe("title");
  });

  it("keeps dynamic required fields required without a binding", () => {
    const DynamicRequiredCT = new ContentType({
      name: "DynamicRequiredCT",
      fields: {
        title: Fields.string().required(),
      },
    });

    expect(() =>
      DynamicRequiredCT.validate({
        _type: "DynamicRequiredCT",
      }),
    ).toThrow("Required field is missing");
  });

  it("strips dynamic bindings when fields opt out", () => {
    const ClosedBindingCT = new ContentType({
      name: "ClosedBindingCT",
      fields: {
        title: Fields.string().required().noDynamic(),
      },
    });

    const parsed = ClosedBindingCT.validate({
      _type: "ClosedBindingCT",
      title: "Manual",
      _bindings: {
        fields: {
          title: {
            contentType: "Article",
            id: "64f0c0000000000000000001",
            path: "title",
          },
        },
      },
    });

    expect("_bindings" in parsed).toBe(false);
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
          name: "ReservedTemplate",
          fields: {
            [TEMPLATE_FIELD_NAME]: Fields.boolean(),
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
        field
          .condition(condition)
          .required()
          .translatable()
          .noDynamic()
          .getCondition(),
      ).toEqual(condition);
      expect(field.noDynamic().getIsDynamic()).toBe(false);
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

  it("encodes dynamic opt-out for the manager", () => {
    const DynamicOptOutEncodedCT = new ContentType({
      name: "DynamicOptOutEncoded",
      fields: {
        title: Fields.string().noDynamic(),
      },
    });

    registerContentType(DynamicOptOutEncodedCT);

    const encoded = getContentTypesForManager().find(
      (contentType) => contentType.name === DynamicOptOutEncodedCT.name,
    );

    expect(encoded?.fields.title.isDynamic).toBe(false);
  });

  it("encodes automatic SEO bindings for string fields", () => {
    const SeoBindingEncodedCT = new ContentType({
      name: "SeoBindingEncoded",
      fields: {
        title: Fields.string().required().seo("title"),
      },
    });

    registerContentType(SeoBindingEncodedCT);

    const encoded = getContentTypesForManager().find(
      (contentType) => contentType.name === SeoBindingEncodedCT.name,
    );

    expect(encoded?.fields.title.config.seo).toBe("title");
  });

  it("encodes module picker metadata for the manager", () => {
    const ModulePickerEncodedCT = new ContentType({
      name: "ModulePickerEncoded",
      modulePicker: {
        title: "Hero section",
        description: "Large intro block with heading, copy, and CTA.",
        category: "Marketing",
        icon: "PanelTop",
        preview: "/images/modules/hero.webp",
        keywords: ["banner", "cover"],
      },
      fields: {
        title: Fields.string(),
      },
    });

    registerContentType(ModulePickerEncodedCT);

    const encoded = getContentTypesForManager().find(
      (contentType) => contentType.name === ModulePickerEncodedCT.name,
    );

    expect(encoded?.modulePicker).toEqual({
      title: "Hero section",
      description: "Large intro block with heading, copy, and CTA.",
      category: "Marketing",
      icon: "PanelTop",
      preview: "/images/modules/hero.webp",
      keywords: ["banner", "cover"],
    });
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
