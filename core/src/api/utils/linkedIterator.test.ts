import { describe, expect, it } from "bun:test";

import { LinkedIteratorTemplate } from "../../internal-content-types";
import ContentType from "../../lib/ContentType";
import { Fields } from "../../lib/fields";
import { registerContentType } from "../../lib/Registry";
import {
  ITERATOR_FIELD_NAME,
  ITERATOR_UNLINKED_FIELD_NAME,
} from "../../lib/systemFields";
import type { DBService } from "../../orm/dbService";
import { resolveDynamicData } from "./dynamicData";
import {
  applyEffectiveIterator,
  getLinkedIteratorTemplate,
  saveLinkedIteratorTemplate,
} from "./linkedIterator";

const Module = new ContentType({
  name: "LinkedIteratorTestModule",
  fields: {
    heading: Fields.string(),
  },
});

const Category = new ContentType({
  name: "LinkedIteratorTestCategory",
  dynamicDataSource: true,
  fields: {
    title: Fields.string().required(),
  },
  iterator: [{ contentType: Module, type: "new" }],
  linkedIterator: true,
});

const iterator = (heading: string) => [
  {
    name: Module.name,
    value: {
      type: "new" as const,
      data: {
        _type: Module.name,
        heading,
      },
    },
  },
];

const createFakeDb = () => {
  let template:
    | {
        _id: string;
        _type: typeof LinkedIteratorTemplate.name;
        contentType: string;
        payload: string;
        revision: number;
      }
    | undefined;
  const documents: Array<Record<string, unknown> & { _id: string }> = [
    {
      _id: "linked",
      _type: Category.name,
      title: "Linked",
      [ITERATOR_FIELD_NAME]: iterator("old"),
    },
    {
      _id: "local",
      _type: Category.name,
      title: "Local",
      [ITERATOR_UNLINKED_FIELD_NAME]: true,
      [ITERATOR_FIELD_NAME]: iterator("local"),
    },
  ];

  const db = {
    find: async (contentType: ContentType) =>
      contentType.name === LinkedIteratorTemplate.name ? template ?? null : null,
    create: async (_contentType: ContentType, data: Record<string, unknown>) => {
      template = {
        _id: "template",
        _type: LinkedIteratorTemplate.name,
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
    updateMany: async (
      _contentType: ContentType,
      _filter: Record<string, unknown>,
      data: Record<string, unknown>,
    ) => {
      let updatedCount = 0;
      for (const document of documents) {
        if (document[ITERATOR_UNLINKED_FIELD_NAME] === true) continue;
        Object.assign(document, data);
        updatedCount += 1;
      }
      return { updatedCount };
    },
  } as unknown as DBService;

  return { db, documents };
};

describe("linked iterator", () => {
  it("initializes, materializes, and resolves one canonical iterator", async () => {
    const { db, documents } = createFakeDb();
    const shared = iterator("shared");

    const initialized = await saveLinkedIteratorTemplate({
      action: "initialize",
      contentType: Category,
      db,
      iterator: shared,
    });

    expect(initialized.revision).toBe(1);
    expect(await getLinkedIteratorTemplate(db, Category)).toMatchObject({
      configured: true,
      iterator: shared,
      revision: 1,
    });
    expect(documents[0]?.[ITERATOR_FIELD_NAME]).toEqual(shared);
    expect(documents[1]?.[ITERATOR_FIELD_NAME]).toEqual(iterator("local"));

    const linked = await applyEffectiveIterator({
      db,
      contentType: Category,
      document: documents[0]!,
    });
    const local = await applyEffectiveIterator({
      db,
      contentType: Category,
      document: documents[1]!,
    });

    expect(linked[ITERATOR_FIELD_NAME]).toEqual(shared);
    expect(local[ITERATOR_FIELD_NAME]).toEqual(iterator("local"));
  });

  it("rejects stale revisions", async () => {
    const { db } = createFakeDb();
    await saveLinkedIteratorTemplate({
      action: "initialize",
      contentType: Category,
      db,
      iterator: iterator("first"),
    });

    await expect(
      saveLinkedIteratorTemplate({
        action: "update",
        contentType: Category,
        db,
        expectedRevision: 0,
        iterator: iterator("stale"),
      }),
    ).rejects.toThrow("modified by another user");
  });

  it("keeps the category as dynamic-data context for shared modules", async () => {
    const { db, documents } = createFakeDb();
    const shared = [
      {
        name: Module.name,
        value: {
          type: "new" as const,
          data: {
            _type: Module.name,
            _bindings: {
              fields: {
                heading: {
                  contentType: Category.name,
                  path: "title",
                },
              },
            },
          },
        },
      },
    ];
    await saveLinkedIteratorTemplate({
      action: "initialize",
      contentType: Category,
      db,
      iterator: shared,
    });
    registerContentType(Module);
    registerContentType(Category);
    const effective = await applyEffectiveIterator({
      db,
      contentType: Category,
      document: documents[0]!,
    });

    const populated = {
      ...effective,
      [ITERATOR_FIELD_NAME]: (
        effective[ITERATOR_FIELD_NAME] as Array<{
          name: string;
          value: { data: Record<string, unknown> };
        }>
      ).map((item) => ({
        name: item.name,
        value: item.value.data,
      })),
    };
    const resolved = await resolveDynamicData(populated, {
      db,
      contentType: Category,
      surface: "web",
    });

    expect(
      (
        resolved[ITERATOR_FIELD_NAME] as Array<{
          value: { heading: string };
        }>
      )[0]?.value.heading,
    ).toBe("Linked");
  });
});
