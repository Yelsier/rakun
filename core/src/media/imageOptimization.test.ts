import { describe, expect, it } from "bun:test";
import sharp from "sharp";

import { deleteMediaStorage } from "../api/routes/manager/media/deleteMediaStorage";
import { createLogger } from "../lib/Logger";
import { createMediaService, type StorageAdapter } from "./index";
import { optimizeImageUpload } from "./imageOptimization";

createLogger({ level: "fatal" });

const makeImage = () =>
  sharp({
    create: {
      width: 2000,
      height: 1000,
      channels: 3,
      background: "#336699",
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();

describe("optimizeImageUpload responsive sizes", () => {
  it("generates sorted responsive image variants without upscaling", async () => {
    const result = await optimizeImageUpload({
      buffer: await makeImage(),
      mime: "image/jpeg",
      fileName: "hero.jpg",
      key: "public/uploads/hero.jpg",
      optimizeOptions: {
        format: "webp",
        quality: 80,
        generatePreview: false,
        generateSizes: true,
        responsiveSizes: [1280, 320, 640, 2500, 2000],
        minBytesToOptimize: 1,
        previewMaxWidth: 32,
      },
    });

    expect(result.sizes?.map((size) => size.width)).toEqual([320, 640, 1280]);
    expect(result.sizes?.map((size) => size.height)).toEqual([160, 320, 640]);
    expect(result.sizes?.map((size) => size.key)).toEqual([
      "public/uploads/hero.320w.webp",
      "public/uploads/hero.640w.webp",
      "public/uploads/hero.1280w.webp",
    ]);
    expect(result.sizes?.every((size) => size.mime === "image/webp")).toBe(
      true,
    );
    expect(result.sizes?.every((size) => size.content.length > 0)).toBe(true);
  });

  it("skips responsive variants when generateSizes is false", async () => {
    const result = await optimizeImageUpload({
      buffer: await makeImage(),
      mime: "image/jpeg",
      fileName: "hero.jpg",
      key: "public/uploads/hero.jpg",
      optimizeOptions: {
        format: "webp",
        quality: 80,
        generatePreview: false,
        generateSizes: false,
        responsiveSizes: [320, 640],
        minBytesToOptimize: 1,
        previewMaxWidth: 32,
      },
    });

    expect(result.sizes).toBeUndefined();
  });

  it("embeds a tiny data-url preview when generatePreview is enabled", async () => {
    const result = await optimizeImageUpload({
      buffer: await makeImage(),
      mime: "image/jpeg",
      fileName: "hero.jpg",
      key: "public/uploads/hero.jpg",
      optimizeOptions: {
        format: "webp",
        quality: 80,
        generatePreview: true,
        generateSizes: false,
        responsiveSizes: [320],
        minBytesToOptimize: 1,
        previewMaxWidth: 32,
      },
    });

    expect(result.preview?.mime).toMatch(/^image\//);
    expect(
      result.preview?.dataUrl.startsWith(`data:${result.preview.mime};base64,`),
    ).toBe(true);
    expect(result.preview?.dataUrl.length).toBeGreaterThan(
      "data:image/webp;base64,".length,
    );
  });

  it("does not generate responsive variants for non-images", async () => {
    const result = await optimizeImageUpload({
      buffer: Buffer.from("hello"),
      mime: "text/plain",
      fileName: "hello.txt",
      key: "public/uploads/hello.txt",
      optimizeOptions: {
        format: "webp",
        quality: 80,
        generatePreview: false,
        generateSizes: true,
        responsiveSizes: [320, 640],
        minBytesToOptimize: 1,
        previewMaxWidth: 32,
      },
    });

    expect(result.sizes).toBeUndefined();
  });
});

describe("deleteMediaStorage", () => {
  it("deletes original, preview, responsive sizes, and video sources", async () => {
    const deletedKeys: string[] = [];
    const adapter: StorageAdapter = {
      createPresignedPut: async (input) => ({ url: "", key: input.key }),
      putObject: async () => undefined,
      headObject: async () => ({ size: 0 }),
      createPresignedGet: async () => ({ url: "", expiresAt: new Date() }),
      deleteObject: async (input) => {
        deletedKeys.push(input.key);
      },
      publicUrl: () => null,
    };
    createMediaService({ adapter });

    await deleteMediaStorage({
      mediaItems: [
        {
          key: "public/uploads/hero.webp",
          previewKey: "public/uploads/hero.preview.webp",
          access: "public",
          sizes: [
            { key: "public/uploads/hero.320w.webp" },
            { key: "public/uploads/hero.640w.webp" },
            { notAKey: true },
          ],
          sources: [
            { key: "public/uploads/hero.mp4" },
            { key: "public/uploads/hero.webm" },
          ],
        },
      ],
      traceName: "test",
    });

    expect(deletedKeys).toEqual([
      "public/uploads/hero.webp",
      "public/uploads/hero.preview.webp",
      "public/uploads/hero.320w.webp",
      "public/uploads/hero.640w.webp",
      "public/uploads/hero.mp4",
      "public/uploads/hero.webm",
    ]);
  });

  it("skips deleting protected Next public static media keys", async () => {
    const deletedKeys: string[] = [];
    const adapter: StorageAdapter = {
      createPresignedPut: async (input) => ({ url: "", key: input.key }),
      putObject: async () => undefined,
      headObject: async () => ({ size: 0 }),
      createPresignedGet: async () => ({ url: "", expiresAt: new Date() }),
      deleteObject: async (input) => {
        deletedKeys.push(input.key);
      },
      publicUrl: () => null,
    };
    createMediaService({ adapter });

    await deleteMediaStorage({
      mediaItems: [
        {
          key: "public/dynamic-data/aurora.svg",
          previewKey: "public/dynamic-data/aurora.svg",
          access: "public",
          sizes: [{ key: "public/uploads/aurora.320w.webp" }],
        },
      ],
      traceName: "test",
    });

    expect(deletedKeys).toEqual(["public/uploads/aurora.320w.webp"]);
  });
});
