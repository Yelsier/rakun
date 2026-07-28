import { describe, expect, it } from "bun:test";
import { ObjectId } from "mongodb";

import ContentType from "../../lib/ContentType";
import { Fields } from "../../lib/fields";
import { DbErrorConflict } from "../dbService";
import { updateHandler } from "./update";

const CompoundUniqueCT = new ContentType({
  name: "CompoundUniqueUpdateTest",
  fields: {
    scope: Fields.string().required(),
    value: Fields.string().required(),
    externalId: Fields.string(),
  },
  uniques: [["scope", "value"], ["externalId"]],
});

describe("update operation", () => {
  it("reports unique conflicts with an HTTP conflict status", () => {
    expect(new DbErrorConflict("conflict").status).toBe(409);
  });

  it("checks a partial update using the complete affected unique group", async () => {
    const id = new ObjectId();
    const before = {
      _id: id,
      _type: CompoundUniqueCT.name,
      scope: "page",
      value: "before",
      externalId: "external",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    let uniqueFilter: Record<string, unknown> | undefined;

    const collection = {
      findOne: async (filter: Record<string, unknown>) => {
        if ("_id" in filter) return before;
        uniqueFilter = filter;
        return null;
      },
      findOneAndUpdate: async () => ({
        ...before,
        value: "after",
        updatedAt: new Date(),
      }),
    };
    const db = {
      collection: () => collection,
    };

    await updateHandler(db as never, () => ({}) as never)(
      CompoundUniqueCT,
      id.toHexString(),
      { value: "after" },
    );

    const uniqueConditions = (
      uniqueFilter?.$and as Array<{
        $or?: Array<Record<string, unknown>>;
      }>
    )[1]?.$or;
    expect(uniqueConditions).toEqual([
      {
        scope: "page",
        value: "after",
      },
    ]);
  });
});
