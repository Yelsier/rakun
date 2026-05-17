import { describe, expect, it } from "bun:test";

import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { LanguageSchema } from "../internal-content-types/Language";
import type { TranslationService } from "./translationService";
import { createDocumentTranslationPatch } from "./document";

const en = {
  _id: "en",
  _type: "Language",
  code: "en",
  name: "English",
  default: true,
} as LanguageSchema;

const es = {
  _id: "es",
  _type: "Language",
  code: "es",
  name: "Spanish",
  default: false,
} as LanguageSchema;

const fr = {
  _id: "fr",
  _type: "Language",
  code: "fr",
  name: "French",
  default: false,
} as LanguageSchema;

const richText = (text: string) => ({
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text,
            type: "text",
            version: 1,
          },
        ],
        direction: null,
        format: "",
        indent: 0,
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
});

const service: TranslationService = {
  translateBatch: async (input) => ({
    translations: Object.fromEntries(
      input.to.map((language) => [
        language.code,
        Object.fromEntries(
          input.segments.map((segment) => [
            segment.id,
            `${language.code}:${segment.text}`,
          ]),
        ),
      ]),
    ),
  }),
};

const Module = new ContentType({
  name: "Module",
  fields: {
    title: Fields.string().translatable(),
    body: Fields.string().type("RichText").translatable(),
  },
});

const Seo = new ContentType({
  name: "Seo",
  fields: {
    title: Fields.string().translatable(),
    description: Fields.string().type("Textarea").translatable(),
  },
});

const Page = new ContentType({
  name: "Page",
  fields: {
    title: Fields.string().translatable(),
    slug: Fields.string().type("Slug").translatable(),
    body: Fields.string().type("RichText").translatable(),
    seo: Fields.relation(Seo, "new"),
    modules: Fields.blocks([
      {
        name: "hero",
        field: Fields.relation(Module, "new"),
      },
    ]),
  },
});

describe("createDocumentTranslationPatch", () => {
  it("translates multiple target languages without overwriting filled values", async () => {
    const result = await createDocumentTranslationPatch({
      contentType: Page,
      document: {
        _type: "Page",
        title: {
          _tag: "Translatable",
          en: "Hello",
          es: "Hola",
        },
        slug: {
          _tag: "Translatable",
          en: "hello",
        },
      },
      from: en,
      to: [es, fr],
      overwrite: false,
      service,
    });

    expect(result.patch.title).toEqual({
      _tag: "Translatable",
      en: "Hello",
      es: "Hola",
      fr: "fr:Hello",
    });
    expect(result.patch.slug).toEqual({
      _tag: "Translatable",
      en: "hello",
      es: "es:hello",
      fr: "fr:hello",
    });
    expect([...result.summary.translatedLanguages].sort()).toEqual(["es", "fr"]);
    expect(result.summary.skippedSegments).toBe(3);
  });

  it("translates slugs and seo title without exposing internal paths to adapters", async () => {
    let capturedSegments: unknown[] = [];
    const capturingService: TranslationService = {
      translateBatch: async (input) => {
        capturedSegments = input.segments;
        return service.translateBatch(input);
      },
    };

    const result = await createDocumentTranslationPatch({
      contentType: Page,
      document: {
        _type: "Page",
        slug: {
          _tag: "Translatable",
          en: "home",
        },
        seo: {
          type: "new",
          data: {
            _type: "Seo",
            title: {
              _tag: "Translatable",
              en: "Home SEO",
            },
          },
        },
      },
      from: en,
      to: [es],
      overwrite: false,
      service: capturingService,
    });

    expect(capturedSegments).toEqual([
      { id: "0", text: "home" },
      { id: "1", text: "Home SEO" },
    ]);
    expect(
      capturedSegments.some(
        (segment) => "path" in (segment as Record<string, unknown>),
      ),
    ).toBe(false);
    expect(result.patch.slug).toEqual({
      _tag: "Translatable",
      en: "home",
      es: "es:home",
    });
    expect(
      (
        result.patch.seo as {
          data: { title: { es: string } };
        }
      ).data.title.es,
    ).toBe("es:Home SEO");
  });

  it("overwrites filled target values when requested", async () => {
    const result = await createDocumentTranslationPatch({
      contentType: Page,
      document: {
        _type: "Page",
        title: {
          _tag: "Translatable",
          en: "Hello",
          es: "Hola",
        },
      },
      from: en,
      to: [es],
      overwrite: true,
      service,
    });

    expect(result.patch.title).toEqual({
      _tag: "Translatable",
      en: "Hello",
      es: "es:Hello",
    });
  });

  it("preserves rich text structure while translating text nodes", async () => {
    const result = await createDocumentTranslationPatch({
      contentType: Page,
      document: {
        _type: "Page",
        body: {
          _tag: "Translatable",
          en: richText("Hello world"),
        },
      },
      from: en,
      to: [fr],
      overwrite: false,
      service,
    });

    const translated = result.patch.body as {
      fr: ReturnType<typeof richText>;
    };

    expect(translated.fr.root.type).toBe("root");
    expect(translated.fr.root.children[0].type).toBe("paragraph");
    expect(translated.fr.root.children[0].children[0].text).toBe(
      "fr:Hello world",
    );
  });

  it("translates nested new relations inside list fields", async () => {
    const result = await createDocumentTranslationPatch({
      contentType: Page,
      document: {
        _type: "Page",
        modules: [
          {
            name: "hero",
            value: {
              type: "new",
              data: {
                _type: "Module",
                title: {
                  _tag: "Translatable",
                  en: "Nested title",
                },
              },
            },
          },
          {
            name: "hero",
            value: {
              type: "existing",
              _id: "module-id",
              contentType: "Module",
            },
          },
        ],
      },
      from: en,
      to: [fr],
      overwrite: false,
      service,
    });

    expect(result.patch.modules).toEqual([
      {
        name: "hero",
        value: {
          type: "new",
          data: {
            _type: "Module",
            title: {
              _tag: "Translatable",
              en: "Nested title",
              fr: "fr:Nested title",
            },
          },
        },
      },
      {
        name: "hero",
        value: {
          type: "existing",
          _id: "module-id",
          contentType: "Module",
        },
      },
    ]);
  });

  it("skips empty source values", async () => {
    const result = await createDocumentTranslationPatch({
      contentType: Page,
      document: {
        _type: "Page",
        title: {
          _tag: "Translatable",
          en: "",
        },
      },
      from: en,
      to: [fr],
      overwrite: false,
      service,
    });

    expect(result.patch).toEqual({});
    expect(result.summary.translatedSegments).toBe(0);
  });
});
