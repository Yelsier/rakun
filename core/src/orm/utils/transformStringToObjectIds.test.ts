import { describe, expect, it } from "bun:test";

import { getMongoDB } from "../mongodbPeer";
import { transformStringToObjectIds } from "./transformStringToObjectIds";

describe("transformStringToObjectIds", () => {
  it("converts direct and operator values for dotted _id filters", () => {
    const { ObjectId } = getMongoDB();
    const directId = "64f0c0000000000000000001";
    const includedId = "64f0c0000000000000000002";

    const transformed = transformStringToObjectIds({
      "category._id": directId,
      "categories._id": { $in: [includedId] },
    });

    expect(transformed["category._id"]).toBeInstanceOf(ObjectId);
    expect(String(transformed["category._id"])).toBe(directId);
    expect(transformed["categories._id"].$in[0]).toBeInstanceOf(ObjectId);
    expect(String(transformed["categories._id"].$in[0])).toBe(includedId);
  });
});
