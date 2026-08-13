import { describe, expect, it } from "bun:test";
import { spawn } from "child_process";
import { mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";

import { optimizeVideoUpload } from "./videoOptimization";

const imageOptions = {
  format: "webp" as const,
  quality: 80,
  generatePreview: true,
  generateSizes: true,
  responsiveSizes: [320, 640],
  minBytesToOptimize: 1,
  previewMaxWidth: 32,
};

const run = async (executable: string, args: string[]) => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, {
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true,
    });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr));
    });
  });
};

describe("optimizeVideoUpload", () => {
  it("creates MP4 and WebM browser sources and uses MP4 as the primary file", async () => {
    const calls: string[] = [];
    const result = await optimizeVideoUpload({
      buffer: Buffer.from("mov-source"),
      mime: "video/quicktime",
      fileName: "launch.mov",
      key: "public/uploads/launch.mov",
      optimizeOptions: {
        ...imageOptions,
        video: { quality: 72 },
      },
      transcode: async ({ format, quality }) => {
        calls.push(`${format}:${quality}`);
        return Buffer.from(`converted-${format}`);
      },
    });

    expect(calls).toEqual(["mp4:72", "webm:72"]);
    expect(result.key).toBe("public/uploads/launch.mp4");
    expect(result.fileName).toBe("launch.mp4");
    expect(result.mime).toBe("video/mp4");
    expect(result.optimizedFormat).toBe("mp4,webm");
    expect(result.sources?.map(({ key, mime }) => ({ key, mime }))).toEqual([
      { key: "public/uploads/launch.mp4", mime: "video/mp4" },
      { key: "public/uploads/launch.webm", mime: "video/webm" },
    ]);
  });

  it("defaults video quality for existing image-only optimization configs", async () => {
    const qualities: number[] = [];
    await optimizeVideoUpload({
      buffer: Buffer.from("mov-source"),
      mime: "video/quicktime",
      fileName: "launch.mov",
      key: "public/uploads/launch.mov",
      optimizeOptions: imageOptions,
      transcode: async ({ quality }) => {
        qualities.push(quality);
        return Buffer.from("converted");
      },
    });

    expect(qualities).toEqual([80, 80]);
  });

  it("transcodes a real MOV input with ffmpeg-static", async () => {
    const ffmpegPath = require("ffmpeg-static") as string;
    const temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "rakun-video-test-"),
    );
    const sourcePath = path.join(temporaryDirectory, "source.mov");

    try {
      await run(ffmpegPath, [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=#336699:s=64x64:d=0.2",
        "-an",
        "-c:v",
        "libx264",
        sourcePath,
      ]);
      const source = await readFile(sourcePath);
      const result = await optimizeVideoUpload({
        buffer: source,
        mime: "video/quicktime",
        fileName: "source.mov",
        key: "public/uploads/source.mov",
        optimizeOptions: {
          ...imageOptions,
          video: { quality: 80 },
        },
      });

      expect(result.content.length).toBeGreaterThan(0);
      expect(result.sources?.map((item) => item.mime)).toEqual([
        "video/mp4",
        "video/webm",
      ]);
      expect(result.sources?.every((item) => item.content.length > 0)).toBe(
        true,
      );
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
