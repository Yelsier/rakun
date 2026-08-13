import { spawn } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";

import {
  FileOptimizeOptionsSchema,
  type FileOptimizeOptions,
  type FileVideoOptimizeFormat,
} from "../lib/fields/File";
import { requirePeerDependency } from "../lib/utils/peerDependencies";
import type { UploadOptimizationOutput } from "./imageOptimization";

type VideoTranscodeInput = {
  buffer: Buffer;
  format: FileVideoOptimizeFormat;
  quality: number;
};

type VideoTranscoder = (input: VideoTranscodeInput) => Promise<Buffer>;

type VideoOptimizationInput = {
  buffer: Buffer;
  mime: string;
  fileName: string;
  key: string;
  optimizeOptions: FileOptimizeOptions;
  transcode?: VideoTranscoder;
};

const formatMetadata: Record<
  FileVideoOptimizeFormat,
  { extension: string; mime: "video/mp4" | "video/webm" }
> = {
  mp4: { extension: "mp4", mime: "video/mp4" },
  webm: { extension: "webm", mime: "video/webm" },
};

const replaceExtension = (fileName: string, extension: string): string => {
  const parsed = path.parse(fileName);
  return `${parsed.name}.${extension}`;
};

const replaceKeyExtension = (key: string, extension: string): string => {
  const parsed = path.posix.parse(key);
  return path.posix.join(parsed.dir, `${parsed.name}.${extension}`);
};

const qualityToCrf = (
  quality: number,
  format: FileVideoOptimizeFormat,
): number => {
  const [best, worst] = format === "mp4" ? [18, 45] : [15, 45];
  return Math.round(worst - ((quality - 1) / 99) * (worst - best));
};

const getFfmpegPath = (): string => {
  const ffmpegPath = requirePeerDependency<string | null>(
    "ffmpeg-static",
    "npm install ffmpeg-static",
    "Rakun uses FFmpeg to convert video uploads to MP4 and WebM.",
  );

  if (!ffmpegPath) {
    throw new Error("Rakun could not resolve the ffmpeg-static executable.");
  }

  return ffmpegPath;
};

const runFfmpeg = async (args: string[]): Promise<void> => {
  const ffmpegPath = getFfmpegPath();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true,
    });
    let stderr = "";

    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderr = `${stderr}${String(chunk)}`.slice(-16_384);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `FFmpeg video conversion failed${stderr.trim() ? `: ${stderr.trim()}` : ""}`,
        ),
      );
    });
  });
};

const transcodeWithFfmpeg: VideoTranscoder = async ({
  buffer,
  format,
  quality,
}) => {
  const temporaryDirectory = await mkdtemp(
    path.join(os.tmpdir(), "rakun-video-"),
  );
  const inputPath = path.join(temporaryDirectory, "input.video");
  const outputPath = path.join(temporaryDirectory, `output.${format}`);

  try {
    await writeFile(inputPath, buffer);
    const commonArgs = ["-y", "-i", inputPath, "-map", "0:v:0", "-map", "0:a?"];

    if (format === "mp4") {
      await runFfmpeg([
        ...commonArgs,
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        String(qualityToCrf(quality, format)),
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        outputPath,
      ]);
    } else {
      await runFfmpeg([
        ...commonArgs,
        "-c:v",
        "libvpx-vp9",
        "-crf",
        String(qualityToCrf(quality, format)),
        "-b:v",
        "0",
        "-row-mt",
        "1",
        "-c:a",
        "libopus",
        "-b:a",
        "128k",
        outputPath,
      ]);
    }

    return await readFile(outputPath);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
};

export async function optimizeVideoUpload(
  input: VideoOptimizationInput,
): Promise<UploadOptimizationOutput> {
  const options = FileOptimizeOptionsSchema.parse(input.optimizeOptions);
  const quality = options.video.quality;
  const transcode = input.transcode ?? transcodeWithFfmpeg;
  const formats = ["mp4", "webm"] as const;
  const converted: NonNullable<UploadOptimizationOutput["sources"]> = [];

  for (const format of formats) {
    const metadata = formatMetadata[format];
    const content = await transcode({
      buffer: input.buffer,
      format,
      quality,
    });
    converted.push({
      key: replaceKeyExtension(input.key, metadata.extension),
      mime: metadata.mime,
      size: content.length,
      content,
    });
  }
  const primary = converted.find((source) => source.mime === "video/mp4")!;

  return {
    key: primary.key,
    mime: primary.mime,
    size: primary.size,
    fileName: replaceExtension(input.fileName, "mp4"),
    optimized: true,
    optimizedFormat: formats.join(","),
    optimizationQuality: quality,
    originalSize: input.buffer.length,
    content: primary.content,
    sources: converted,
  };
}
