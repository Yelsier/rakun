import { beforeAll, describe, expect, it } from "bun:test";

import ContentType from "../../lib/ContentType";
import { Fields } from "../../lib/fields";
import { createLogger } from "../../lib/Logger";
import { parseSafeManagerQuery } from "./safeManagerQuery";

const TestContent = new ContentType({
  name: "SafeQueryTest",
  fields: {
    title: Fields.string().required(),
    views: Fields.number(),
    password: Fields.string().type("Password"),
  },
});

const expectInvalid = (query: Parameters<typeof parseSafeManagerQuery>[1]) => {
  expect(() => parseSafeManagerQuery(TestContent, query)).toThrow(
    "VALIDATION",
  );
};

describe("parseSafeManagerQuery", () => {
  beforeAll(() => {
    createLogger({ level: "fatal" });
  });

  it("rejects unsafe mongo operators", () => {
    expectInvalid({ filter: { $where: "return true" } });
    expectInvalid({ filter: { title: { $regex: ".*" } } });
    expectInvalid({ filter: { title: { $expr: { $gt: ["$views", 0] } } } });
  });

  it("rejects fields outside the content type allowlist", () => {
    expectInvalid({ filter: { unknown: "x" } });
    expectInvalid({ options: { sort: { unknown: "asc" } } });
    expectInvalid({ options: { fields: ["password"] } });
  });

  it("escapes $contains and caps public list limits", () => {
    const parsed = parseSafeManagerQuery(TestContent, {
      filter: {
        title: {
          $contains: "a.b*",
        },
      },
      options: {
        limit: 999,
        sort: {
          createdAt: "desc",
        },
        fields: ["title", "_id"],
      },
    });

    expect(parsed.filter?.title).toEqual({
      $regex: "a\\.b\\*",
      $options: "i",
    });
    expect(parsed.options?.limit).toBe(100);
  });
});
