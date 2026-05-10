import { describe, expect, it } from "bun:test";

import ContentType from "../../lib/ContentType";
import { Fields } from "../../lib/fields";
import { listhandler } from "./list";

const TestCT = new ContentType({
  name: "ProjectionTest",
  fields: {
    title: Fields.string().required(),
    slug: Fields.string().required(),
  },
});

describe("list operation", () => {
  it("converts fields option to a Mongo projection object", async () => {
    let findOptions: Record<string, unknown> | undefined;
    const db = {
      collection: () => ({
        find: (_filter: unknown, options: Record<string, unknown>) => {
          findOptions = options;
          return {
            toArray: async () => [],
          };
        },
        countDocuments: async () => 0,
      }),
    };

    await listhandler(db as never)(TestCT, {
      options: { fields: ["slug", "title.en"], limit: "all" },
    });

    expect(findOptions?.projection).toEqual({
      slug: 1,
      title: 1,
    });
  });
});
