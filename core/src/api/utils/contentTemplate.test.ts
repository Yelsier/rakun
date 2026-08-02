import { describe, expect, it } from "bun:test";

import {
  ContentTemplate,
  TemplateContent,
} from "../../internal-content-types";
import ContentType from "../../lib/ContentType";
import { Fields } from "../../lib/fields";
import {
  encodeContentTypeForManager,
  registerContentType,
} from "../../lib/Registry";
import { ITERATOR_FIELD_NAME } from "../../lib/systemFields";
import type { DBService } from "../../orm/dbService";
import {
  applyContentTemplate,
  createTemplateContentSlot,
  getContentTemplate,
  saveContentTemplate,
  validateContentTemplate,
} from "./contentTemplate";

const Body = new ContentType({
  name: "TemplateTestBody",
  fields: { body: Fields.string() },
});

const Hero = new ContentType({
  name: "TemplateTestHero",
  fields: { title: Fields.string() },
});

const LayoutWithInfo = new ContentType({
  name: "TemplateTestLayoutWithInfo",
  fields: {
    info: Fields.string(),
    blocks: Fields.blocks([]),
  },
});

const UseCase = new ContentType({
  name: "TemplateTestUseCase",
  dynamicDataSource: true,
  fields: { title: Fields.string() },
  iterator: [
    { contentType: Body, type: "new" },
    { contentType: Hero, type: "new" },
    { contentType: LayoutWithInfo, type: "new" },
  ],
}).enableTemplate();

const inline = (contentType: ContentType, data: Record<string, unknown> = {}) => ({
  name: contentType.name,
  value: {
    type: "new" as const,
    data: { _type: contentType.name, ...data },
  },
});

const nestedTemplate = () => [
  inline(Hero, { title: "Shared hero" }),
  inline(LayoutWithInfo, {
    info: "Shared aside",
    blocks: [createTemplateContentSlot()],
  }),
];

const createFakeDb = () => {
  let template:
    | {
        _id: string;
        _type: typeof ContentTemplate.name;
        contentType: string;
        payload: string;
        revision: number;
      }
    | undefined;

  const db = {
    find: async (contentType: ContentType) =>
      contentType.name === ContentTemplate.name ? template ?? null : null,
    create: async (_contentType: ContentType, data: Record<string, unknown>) => {
      template = {
        _id: "template",
        _type: ContentTemplate.name,
        contentType: String(data.contentType),
        payload: String(data.payload),
        revision: Number(data.revision),
      };
      return template;
    },
    update: async (
      _contentType: ContentType,
      _id: string,
      data: Record<string, unknown>,
    ) => {
      template = { ...template!, ...data };
      return template;
    },
  } as unknown as DBService;

  return db;
};

describe("content template", () => {
  it("adds Content to the root picker and nested blocks pickers", () => {
    const encoded = encodeContentTypeForManager(UseCase);
    const templateField = encoded.templateField as {
      fields: Array<{
        name: string;
        field: {
          contentType?: {
            fields: Record<
              string,
              { fields?: Array<{ name: string }> }
            >;
          };
        };
      }>;
    };

    expect(templateField.fields.map((entry) => entry.name)).toContain(
      TemplateContent.name,
    );
    const wrapper = templateField.fields.find(
      (entry) => entry.name === LayoutWithInfo.name,
    );
    expect(
      wrapper?.field.contentType?.fields.blocks?.fields?.map(
        (entry) => entry.name,
      ),
    ).toContain(TemplateContent.name);
  });

  it("accepts one Content slot inside an otherwise empty blocks field", () => {
    expect(validateContentTemplate(UseCase, nestedTemplate())).toEqual(
      nestedTemplate(),
    );
  });

  it("requires exactly one Content slot", () => {
    expect(() => validateContentTemplate(UseCase, [inline(Hero)])).toThrow(
      "exactly one Content slot",
    );
    expect(() =>
      validateContentTemplate(UseCase, [
        createTemplateContentSlot(),
        createTemplateContentSlot(),
      ]),
    ).toThrow("exactly one Content slot");
  });

  it("persists revisions without materializing the template into documents", async () => {
    const db = createFakeDb();
    const created = await saveContentTemplate({
      contentType: UseCase,
      db,
      modules: nestedTemplate(),
    });

    expect(created.revision).toBe(1);
    expect(await getContentTemplate(db, UseCase)).toMatchObject({
      configured: true,
      modules: nestedTemplate(),
      revision: 1,
    });

    await expect(
      saveContentTemplate({
        contentType: UseCase,
        db,
        expectedRevision: 0,
        modules: nestedTemplate(),
      }),
    ).rejects.toThrow("modified by another user");
  });

  it("expands Content at its nested position", () => {
    const body = inline(Body, { body: "Unique body" });
    const assembled = applyContentTemplate(nestedTemplate(), [body]);
    const wrapper = assembled[1] as {
      value: { data: { blocks: unknown[] } };
    };

    expect(wrapper.value.data.blocks).toEqual([body]);
  });

  it("keeps shared module bindings scoped to the current document", async () => {
    registerContentType(UseCase);
    registerContentType(Hero);
    const template = [
      inline(Hero, {
        _bindings: {
          fields: {
            title: {
              contentType: UseCase.name,
              path: "title",
            },
          },
        },
      }),
      createTemplateContentSlot(),
    ];
    const document = {
      _type: UseCase.name,
      title: "Use case title",
      [ITERATOR_FIELD_NAME]: applyContentTemplate(template, []),
    };
    const { resolveDynamicData } = await import("./dynamicData");
    const resolved = await resolveDynamicData(document, {
      db: {} as DBService,
      contentType: UseCase,
      surface: "web",
    });
    const hero = resolved[ITERATOR_FIELD_NAME][0] as {
      value: { data: { title: string } };
    };

    expect(hero.value.data.title).toBe("Use case title");
  });
});
