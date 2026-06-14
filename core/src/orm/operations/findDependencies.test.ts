import { describe, expect, it } from "bun:test";
import { ObjectId } from "mongodb";

import ContentType from "../../lib/ContentType";
import { Fields } from "../../lib/fields";
import { registerContentType } from "../../lib/Registry";
import { findDependenciesHandler } from "./findDependencies";

describe("findDependencies operation", () => {
  it("finds existing iterator modules used as saved global modules", async () => {
    const TargetModule = new ContentType({
      name: "FindDependencyIteratorTarget",
      fields: {
        title: Fields.string().required(),
      },
    });
    const Page = new ContentType({
      name: "FindDependencyIteratorPage",
      fields: {
        title: Fields.string().required(),
      },
      iterator: [{ contentType: TargetModule, type: "new" }],
    });
    registerContentType(TargetModule);
    registerContentType(Page);

    const targetId = new ObjectId();
    const pageId = new ObjectId();
    const docsByCollection: Record<string, unknown[]> = {
      [Page.name]: [
        {
          _id: pageId,
          _type: Page.name,
          title: "Page",
          _iterator: [
            {
              name: TargetModule.name,
              value: {
                type: "existing",
                _id: targetId,
                contentType: TargetModule.name,
              },
            },
          ],
        },
      ],
      [TargetModule.name]: [
        {
          _id: targetId,
          _type: TargetModule.name,
          title: "Saved module",
        },
      ],
    };
    const db = {
      collection: (name: string) => ({
        find: () => ({
          toArray: async () => docsByCollection[name] ?? [],
        }),
      }),
    };

    const dependencies = await findDependenciesHandler(db as never)(
      TargetModule,
      targetId.toString(),
    );

    expect(dependencies).toContainEqual({
      contentType: Page.name,
      _id: pageId.toString(),
    });
  });

  it("finds saved modules used by module slot records", async () => {
    const TargetModule = new ContentType({
      name: "FindDependencySlotTarget",
      fields: {
        title: Fields.string().required(),
      },
    });
    const ModuleSlot = new ContentType({
      name: "FindDependencyModuleSlot",
      fields: {
        contentType: Fields.string().required(),
        moduleId: Fields.string(),
      },
    });
    registerContentType(TargetModule);
    registerContentType(ModuleSlot);

    const targetId = new ObjectId();
    const slotId = new ObjectId();
    const docsByCollection: Record<string, unknown[]> = {
      [ModuleSlot.name]: [
        {
          _id: slotId,
          _type: ModuleSlot.name,
          contentType: TargetModule.name,
          moduleId: targetId.toString(),
        },
      ],
      [TargetModule.name]: [
        {
          _id: targetId,
          _type: TargetModule.name,
          title: "Saved module",
        },
      ],
    };
    const db = {
      collection: (name: string) => ({
        find: () => ({
          toArray: async () => docsByCollection[name] ?? [],
        }),
      }),
    };

    const dependencies = await findDependenciesHandler(db as never)(
      TargetModule,
      targetId.toString(),
    );

    expect(dependencies).toContainEqual({
      contentType: ModuleSlot.name,
      _id: slotId.toString(),
    });
  });

  it("ignores historical content version snapshots", async () => {
    const TargetModule = new ContentType({
      name: "FindDependencyVersionTarget",
      fields: {
        title: Fields.string().required(),
      },
    });
    const ContentVersionLike = new ContentType({
      name: "ContentVersion",
      fields: {
        contentType: Fields.string().required(),
        snapshot: Fields.string(),
      },
    });
    registerContentType(TargetModule);
    registerContentType(ContentVersionLike);

    const targetId = new ObjectId();
    const versionId = new ObjectId();
    const docsByCollection: Record<string, unknown[]> = {
      [ContentVersionLike.name]: [
        {
          _id: versionId,
          _type: ContentVersionLike.name,
          contentType: TargetModule.name,
          snapshot: {
            _iterator: [
              {
                name: TargetModule.name,
                value: {
                  type: "existing",
                  _id: targetId,
                  contentType: TargetModule.name,
                },
              },
            ],
          },
        },
      ],
      [TargetModule.name]: [
        {
          _id: targetId,
          _type: TargetModule.name,
          title: "Saved module",
        },
      ],
    };
    const db = {
      collection: (name: string) => ({
        find: () => ({
          toArray: async () => docsByCollection[name] ?? [],
        }),
      }),
    };

    const dependencies = await findDependenciesHandler(db as never)(
      TargetModule,
      targetId.toString(),
    );

    expect(dependencies).toEqual([]);
  });
});
