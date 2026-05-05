import z from "zod";
import { getAppErrorStatusCode, isAppError } from "../../../../../lib/errors";
import { getMediaService } from "../../../../../media";
import { optimizeImageUpload } from "../../../../../media/imageOptimization";
import { createRequestContext } from "../../../../context";
import { checkPermissions } from "../../../../utils/checkPermissions";
import type { CookieOptions } from "../../../../context";

const uploadHeadersSchema = z.object({
  key: z.string().min(1),
  access: z.enum(["public", "private"]).default("public"),
  fileName: z.string().min(1),
  mime: z.string().min(1).optional(),
  optimizeRaw: z.string().optional(),
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
): Promise<Buffer> => {
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
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
    checkPermissions(user, ["content.Media.own"]);

    const parsedHeaders = uploadHeadersSchema.parse({
      key: getHeader(req, "x-cms-upload-key"),
      access: getHeader(req, "x-cms-upload-access") || undefined,
      fileName: getHeader(req, "x-cms-upload-file-name"),
      mime: getHeader(req, "x-cms-upload-mime") || undefined,
      optimizeRaw: getHeader(req, "x-cms-upload-optimize") || undefined,
    });

    const rawBody = await readBodyBuffer(req);
    if (rawBody.length === 0) {
      sendJson(res, 400, {
        message: "Empty upload body",
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
    const mime = sanitizeMime(
      parsedHeaders.mime || getHeader(req, "content-type") || undefined,
    );

    const optimized = await optimizeImageUpload({
      buffer: rawBody,
      mime,
      fileName: parsedHeaders.fileName,
      key: parsedHeaders.key,
      optimizeOptions,
    });

    const media = getMediaService();
    await media.rawAdapter.putObject({
      key: optimized.key,
      access: parsedHeaders.access,
      mime: optimized.mime,
      content: optimized.content,
    });

    if (optimized.preview) {
      await media.rawAdapter.putObject({
        key: optimized.preview.key,
        access: parsedHeaders.access,
        mime: optimized.preview.mime,
        content: optimized.preview.content,
      });
    }

    sendJson(res, 200, {
      key: optimized.key,
      access: parsedHeaders.access,
      size: optimized.size,
      mime: optimized.mime,
      fileName: optimized.fileName,
      width: optimized.width,
      height: optimized.height,
      orientation: optimized.orientation,
      previewKey: optimized.preview?.key,
      previewMime: optimized.preview?.mime,
      optimized: optimized.optimized,
      optimizedFormat: optimized.optimizedFormat,
      optimizationQuality: optimized.optimizationQuality,
      originalSize: optimized.originalSize,
    });
  } catch (error) {
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
