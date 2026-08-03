import { describe, expect, it } from "bun:test";
import sharp from "sharp";

import { createMediaServiceFromAdapter } from "../../../../media/mediaService";
import type { StorageAdapter } from "../../../../media/adapters";
import { storeReimportedImage } from "./reimportMedia";

const makeImage = () =>
  sharp({
    create: {
      width: 1000,
      height: 500,
      channels: 3,
      background: "#336699",
    },
  })
    .png()
    .toBuffer();

const createAdapter = ({
  failAt,
}: {
  failAt?: number;
} = {}) => {
  const storedKeys: string[] = [];
  const deletedKeys: string[] = [];
  let putCount = 0;

  const adapter: StorageAdapter = {
    async createPresignedPut(input) {
      return { url: "/upload", key: input.key };
    },
    async putObject(input) {
      putCount += 1;
      if (putCount === failAt) throw new Error("simulated storage failure");
      storedKeys.push(input.key);
    },
    async headObject() {
      return { size: 1, mime: "image/png" };
    },
    async createPresignedGet() {
      return { url: "/media", expiresAt: new Date() };
    },
    async deleteObject(input) {
      deletedKeys.push(input.key);
    },
    publicUrl() {
      return null;
    },
  };

  return { adapter, storedKeys, deletedKeys };
};

const optimizeOptions = {
  format: "webp" as const,
  quality: 80,
  generatePreview: false,
  generateSizes: true,
  responsiveSizes: [320, 640],
  minBytesToOptimize: 10_000_000,
  previewMaxWidth: 480,
};

describe("storeReimportedImage", () => {
  it("stores the replacement and responsive sizes under a new key", async () => {
    const { adapter, storedKeys } = createAdapter();
    const mediaService = createMediaServiceFromAdapter({ adapter });

    const result = await storeReimportedImage({
      mediaService,
      source: await makeImage(),
      fileName: "legacy.png",
      mime: "image/png",
      access: "public",
      optimizeOptions,
    });

    expect(result.sizes?.map((size) => size.width)).toEqual([320, 640]);
    expect(storedKeys).toEqual([
      result.key,
      ...(result.sizes?.map((size) => size.key) ?? []),
    ]);
    expect(new Set(storedKeys).size).toBe(3);
  });

  it("removes newly written objects when storage fails midway", async () => {
    const { adapter, storedKeys, deletedKeys } = createAdapter({ failAt: 2 });
    const mediaService = createMediaServiceFromAdapter({ adapter });

    await expect(
      storeReimportedImage({
        mediaService,
        source: await makeImage(),
        fileName: "legacy.png",
        mime: "image/png",
        access: "public",
        optimizeOptions,
      }),
    ).rejects.toThrow("simulated storage failure");

    expect(deletedKeys).toEqual(storedKeys);
  });
});
