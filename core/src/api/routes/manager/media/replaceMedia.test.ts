import { beforeEach, describe, expect, it } from "bun:test";

import { createLogger } from "../../../../lib/Logger";
import { createMediaService } from "../../../../media";
import type { StorageAdapter } from "../../../../media";
import {
  commitMediaReplacement,
  revalidateMediaDependencies,
} from "./replaceMedia";

const previousStorage = {
  key: "public/images/previous.webp",
  access: "public" as const,
  sizes: [{ key: "public/images/previous.320w.webp" }],
};
const newStorage = {
  key: "public/images/replacement.webp",
  access: "public" as const,
  sizes: [{ key: "public/images/replacement.320w.webp" }],
};

const createAdapter = (events: string[]): StorageAdapter => ({
  async createPresignedPut(input) {
    return { url: "/upload", key: input.key };
  },
  async putObject() {},
  async headObject() {
    return { size: 1, mime: "image/webp" };
  },
  async createPresignedGet() {
    return { url: "https://media.test/image", expiresAt: new Date() };
  },
  async deleteObject(input) {
    events.push(`delete:${input.key}`);
  },
  publicUrl() {
    return null;
  },
});

describe("commitMediaReplacement", () => {
  beforeEach(() => {
    createLogger({ level: "fatal" });
  });

  it("removes old storage only after the media record has been updated", async () => {
    const events: string[] = [];
    createMediaService({ adapter: createAdapter(events) });

    const result = await commitMediaReplacement({
      existingStorage: previousStorage,
      newStorage,
      update: async () => {
        events.push("update");
        return { _id: "media-id", key: newStorage.key };
      },
    });

    expect(result.updated).toEqual({
      _id: "media-id",
      key: newStorage.key,
    });
    expect(result.previousStorageRemoved).toBe(true);
    expect(events).toEqual([
      "update",
      `delete:${previousStorage.key}`,
      `delete:${previousStorage.sizes[0]?.key}`,
    ]);
  });

  it("removes the new upload and leaves old storage alone when updating fails", async () => {
    const events: string[] = [];
    createMediaService({ adapter: createAdapter(events) });

    await expect(
      commitMediaReplacement({
        existingStorage: previousStorage,
        newStorage,
        update: async () => {
          events.push("update");
          throw new Error("simulated database failure");
        },
      }),
    ).rejects.toThrow("simulated database failure");

    expect(events).toEqual([
      "update",
      `delete:${newStorage.key}`,
      `delete:${newStorage.sizes[0]?.key}`,
    ]);
  });
});

describe("revalidateMediaDependencies", () => {
  it("invalidates every document that directly references the media", async () => {
    const invalidated: string[] = [];
    const count = await revalidateMediaDependencies({
      loadDependencies: async () => [
        { contentType: "Page", _id: "page-1" },
        { contentType: "Article", _id: "article-1" },
      ],
      revalidate: async (input) => {
        invalidated.push(`${input.contentType}:${input.contentTypeId}`);
      },
    });

    expect(count).toBe(2);
    expect(invalidated).toEqual(["Page:page-1", "Article:article-1"]);
  });
});
