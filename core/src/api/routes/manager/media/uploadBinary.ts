import z from "zod";
import {
  getAppErrorStatusCode,
  isAppError,
  throwAppError,
} from "../../../../lib/errors";
import { Logger } from "../../../../lib/Logger";
import { getMediaService } from "../../../../media";
import { optimizeImageUpload } from "../../../../media/imageOptimization";
import { createRequestContext } from "../../../context";
import { checkPermissions } from "../../../utils/checkPermissions";
import type { CookieOptions } from "../../../context";
import { verifyMediaUploadToken } from "../../../utils/mediaUploadToken";
import { decodeMediaUploadFileName } from "../../../utils/mediaUploadFileName";

const uploadHeadersSchema = z.object({
  key: z.string().min(1),
  access: z.enum(["public", "private"]).default("public"),
  fileName: z.string().min(1),
  fileNameEncoding: z.string().optional(),
  mime: z.string().min(1).optional(),
  optimizeRaw: z.string().optional(),
  purpose: z.enum(["profileAvatar"]).optional(),
  uploadToken: z.string().min(1),
});

const parseCookieHeader = (cookieHeader: string | undefined) => {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf("=");
        if (idx === -1) return [part, ""];
        return [part.slice(0, idx), decodeURIComponent(part.slice(idx + 1))];
      }),
  );
};

export type MediaBinaryUploadRequest = NodeJS.ReadableStream & {
  headers: Record<string, string | string[] | undefined>;
};

export type MediaBinaryUploadResponse = NodeJS.WritableStream & {
  statusCode?: number;
  setHeader: (name: string, value: string | string[]) => void;
  end: (chunk?: string | Uint8Array) => void;
  cookie?: (name: string, value: string, options?: CookieOptions) => void;
};

const getHeader = (
  req: MediaBinaryUploadRequest,
  name: string,
): string | undefined => {
  const header = req.headers[name.toLowerCase()];

  if (Array.isArray(header)) {
    return header[0];
  }

  return header;
};

const readBodyBuffer = async (
  req: NodeJS.ReadableStream,
  maxBytes: number,
): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  let total = 0;

  await new Promise<void>((resolve, reject) => {
    req.on("data", (chunk: Buffer | string) => {
      const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      total += buffer.length;
      if (total > maxBytes) {
        reject(new Error("Upload body exceeds signed size"));
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => resolve());
    req.on("error", (error) => reject(error));
  });

  return Buffer.concat(chunks);
};

const sanitizeMime = (value: string | undefined): string => {
  if (!value) return "application/octet-stream";
  return value.split(";")[0]?.trim() || "application/octet-stream";
};

const assertObjectDoesNotExist = async ({
  key,
  access,
}: {
  key: string;
  access: "public" | "private";
}) => {
  const media = getMediaService();
  try {
    await media.rawAdapter.headObject({ key, access });
  } catch {
    return;
  }

  throwAppError("CONFLICT", {
    message: "Media object already exists",
    key,
  });
};

const sendJson = (
  res: MediaBinaryUploadResponse,
  statusCode: number,
  body: unknown,
) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
};

export async function handleMediaBinaryUpload(
  req: MediaBinaryUploadRequest,
  res: MediaBinaryUploadResponse,
) {
  try {
    const ctx = await createRequestContext({
      headers: req.headers,
      cookies: parseCookieHeader(getHeader(req, "cookie")),
      res,
    });
    const user = ctx.getUser();

    const rawHeaders = uploadHeadersSchema.parse({
      key: getHeader(req, "x-cms-upload-key"),
      access: getHeader(req, "x-cms-upload-access") || undefined,
      fileName: getHeader(req, "x-cms-upload-file-name"),
      fileNameEncoding:
        getHeader(req, "x-cms-upload-file-name-encoding") || undefined,
      mime: getHeader(req, "x-cms-upload-mime") || undefined,
      optimizeRaw: getHeader(req, "x-cms-upload-optimize") || undefined,
      purpose: getHeader(req, "x-cms-upload-purpose") || undefined,
      uploadToken: getHeader(req, "x-cms-upload-token"),
    });
    const parsedHeaders = {
      ...rawHeaders,
      fileName: decodeMediaUploadFileName(
        rawHeaders.fileName,
        rawHeaders.fileNameEncoding,
      ),
    };
    const tokenPayload = verifyMediaUploadToken(parsedHeaders.uploadToken);
    if (!tokenPayload) {
      sendJson(res, 403, {
        message: "Invalid or expired upload token",
      });
      return;
    }

    const mime = sanitizeMime(
      parsedHeaders.mime || getHeader(req, "content-type") || undefined,
    );
    if (
      tokenPayload.userId !== user._id ||
      tokenPayload.key !== parsedHeaders.key ||
      tokenPayload.access !== parsedHeaders.access ||
      tokenPayload.mime !== mime ||
      (tokenPayload.purpose ?? undefined) !==
        (parsedHeaders.purpose ?? undefined)
    ) {
      sendJson(res, 403, {
        message: "Upload token does not match upload metadata",
      });
      return;
    }

    Logger.addTrace("manager.media.uploadBinary: headers parsed", {
      key: parsedHeaders.key,
      access: parsedHeaders.access,
      fileName: parsedHeaders.fileName,
      mime: parsedHeaders.mime,
      optimize: Boolean(parsedHeaders.optimizeRaw),
    });

    const rawBody = await readBodyBuffer(req, tokenPayload.size);
    Logger.addTrace("manager.media.uploadBinary: body read", {
      size: rawBody.length,
    });
    if (rawBody.length === 0) {
      sendJson(res, 400, {
        message: "Empty upload body",
      });
      return;
    }
    if (rawBody.length !== tokenPayload.size) {
      sendJson(res, 400, {
        message: "Upload size does not match signed size",
      });
      return;
    }

    const optimizeOptions = parsedHeaders.optimizeRaw
      ? (() => {
          try {
            return JSON.parse(parsedHeaders.optimizeRaw);
          } catch {
            throw new z.ZodError([
              {
                code: "custom",
                message: "Invalid optimize options JSON",
                path: ["x-cms-upload-optimize"],
              },
            ]);
          }
        })()
      : undefined;
    if (parsedHeaders.purpose === "profileAvatar") {
      if (!mime.startsWith("image/")) {
        sendJson(res, 400, {
          message: "Profile avatars must be images.",
        });
        return;
      }
    } else {
      checkPermissions(user, ["content.Media.own"]);
    }

    const optimized = await optimizeImageUpload({
      buffer: rawBody,
      mime,
      fileName: parsedHeaders.fileName,
      key: parsedHeaders.key,
      optimizeOptions,
    });
    Logger.addTrace("manager.media.uploadBinary: image optimization resolved", {
      key: optimized.key,
      mime: optimized.mime,
      size: optimized.size,
      optimized: optimized.optimized,
      hasPreview: Boolean(optimized.preview),
    });

    const media = getMediaService();
    Logger.addTrace("manager.media.uploadBinary: media service ready");
    await assertObjectDoesNotExist({
      key: optimized.key,
      access: parsedHeaders.access,
    });
    await media.rawAdapter.putObject({
      key: optimized.key,
      access: parsedHeaders.access,
      mime: optimized.mime,
      content: optimized.content,
    });
    Logger.addTrace("manager.media.uploadBinary: object stored", {
      key: optimized.key,
      access: parsedHeaders.access,
      size: optimized.content.length,
    });

    if (optimized.preview) {
      await assertObjectDoesNotExist({
        key: optimized.preview.key,
        access: parsedHeaders.access,
      });
      await media.rawAdapter.putObject({
        key: optimized.preview.key,
        access: parsedHeaders.access,
        mime: optimized.preview.mime,
        content: optimized.preview.content,
      });
      Logger.addTrace("manager.media.uploadBinary: preview stored", {
        key: optimized.preview.key,
        access: parsedHeaders.access,
        size: optimized.preview.content.length,
      });
    }

    if (optimized.sizes?.length) {
      await Promise.all(
        optimized.sizes.map((size) =>
          assertObjectDoesNotExist({
            key: size.key,
            access: parsedHeaders.access,
          }),
        ),
      );
      await Promise.all(
        optimized.sizes.map((size) =>
          media.rawAdapter.putObject({
            key: size.key,
            access: parsedHeaders.access,
            mime: size.mime,
            content: size.content,
          }),
        ),
      );
      Logger.addTrace("manager.media.uploadBinary: responsive sizes stored", {
        count: optimized.sizes.length,
      });
    }

    Logger.addTrace("manager.media.uploadBinary: response ready");
    sendJson(res, 200, {
      key: optimized.key,
      access: parsedHeaders.access,
      size: optimized.size,
      mime: optimized.mime,
      fileName: optimized.fileName,
      width: optimized.width,
      height: optimized.height,
      orientation: optimized.orientation,
      sizes: optimized.sizes?.map(({ content: _, ...size }) => size),
      previewKey: optimized.preview?.key,
      previewMime: optimized.preview?.mime,
      optimized: optimized.optimized,
      optimizedFormat: optimized.optimizedFormat,
      optimizationQuality: optimized.optimizationQuality,
      originalSize: optimized.originalSize,
    });
  } catch (error) {
    Logger.addTrace("manager.media.uploadBinary: handler failed");
    Logger.error("manager.media.uploadBinary failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (isAppError(error)) {
      sendJson(res, getAppErrorStatusCode(error) ?? 500, {
        message: error.message,
      });
      return;
    }

    if (error instanceof z.ZodError) {
      sendJson(res, 400, {
        message: "Invalid upload headers",
        issues: error.issues,
      });
      return;
    }

    if (
      error instanceof Error &&
      error.message === "Upload body exceeds signed size"
    ) {
      sendJson(res, 413, {
        message: error.message,
      });
      return;
    }

    if (error instanceof Error) {
      sendJson(res, 500, {
        message: error.message,
      });
      return;
    }

    sendJson(res, 500, {
      message: "Unknown upload error",
    });
  }
}
