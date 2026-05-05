import { randomUUID } from "crypto";

import type { MediaAccess, PresignedPut, StorageAdapter } from "./adapters";

type MediaErrorTag =
  | "MediaError"
  | "MediaErrorUnknown"
  | "MediaErrorInvalidData"
  | "MediaErrorNotFound";

export class MediaError extends Error {
  _tag: MediaErrorTag = "MediaError";
  status: number;

  constructor(
    public override readonly message: string,
    public readonly details?: unknown,
    status = 500,
  ) {
    super(message);
    this.name = "MediaError";
    this.status = status;
  }
}

export class MediaErrorUnknown extends MediaError {
  constructor(
    public override readonly message: string,
    public readonly details?: unknown,
  ) {
    super(message, details);
    this._tag = "MediaErrorUnknown";
  }
}

export class MediaErrorInvalidData extends MediaError {
  constructor(
    public override readonly message: string,
    public readonly details?: unknown,
  ) {
    super(message, details, 400);
    this._tag = "MediaErrorInvalidData";
  }
}

export class MediaErrorNotFound extends MediaError {
  constructor(
    public override readonly message: string,
    public readonly details?: unknown,
  ) {
    super(message, details, 404);
    this._tag = "MediaErrorNotFound";
  }
}

export type PrepareUploadInput = {
  fileName: string;
  mime: string;
  size: number;
  access?: MediaAccess;
  key?: string;
  folder?: string;
};

export type PrepareUploadOutput = PresignedPut & {
  access: MediaAccess;
};

export type FinalizeUploadInput = {
  key: string;
  access?: MediaAccess;
};

export type FinalizeUploadOutput = {
  key: string;
  access: MediaAccess;
  size: number;
  mime?: string;
  etag?: string;
  publicUrl: string | null;
};

export type GetMediaUrlInput = {
  key: string;
  access?: MediaAccess;
  expiresInSeconds?: number;
};

export type GetMediaUrlOutput = {
  key: string;
  access: MediaAccess;
  url: string;
  expiresAt: Date | null;
  isPublic: boolean;
};

export interface MediaService {
  rawAdapter: StorageAdapter;
  prepareUpload: (input: PrepareUploadInput) => Promise<PrepareUploadOutput>;
  finalizeUpload: (input: FinalizeUploadInput) => Promise<FinalizeUploadOutput>;
  getMediaUrl: (input: GetMediaUrlInput) => Promise<GetMediaUrlOutput>;
}

export type CreateMediaServiceInput = {
  adapter: StorageAdapter;
  defaultAccess?: MediaAccess;
  defaultGetExpiresInSeconds?: number;
  uploadUrl?: string;
};

const sanitizeSegment = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^\/+|\/+$/g, "");

const getExtension = (fileName: string): string => {
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  const maybeExt = parts[parts.length - 1]?.toLowerCase() || "";
  return maybeExt.replace(/[^a-z0-9]/g, "");
};

const ensureValidInput = (input: PrepareUploadInput): void => {
  if (!input.fileName?.trim()) {
    throw new MediaErrorInvalidData("fileName is required");
  }
  if (!input.mime?.trim()) {
    throw new MediaErrorInvalidData("mime is required");
  }
  if (!Number.isFinite(input.size) || input.size <= 0) {
    throw new MediaErrorInvalidData("size must be a positive number");
  }
};

const buildObjectKey = (
  input: PrepareUploadInput,
  access: MediaAccess,
): string => {
  if (input.key?.trim()) return sanitizeSegment(input.key);

  const safeFolder = input.folder ? sanitizeSegment(input.folder) : "uploads";
  const ext = getExtension(input.fileName);
  const date = new Date().toISOString().slice(0, 10);
  const id = randomUUID().replace(/-/g, "");

  return `${access}/${safeFolder}/${date}/${id}${ext ? `.${ext}` : ""}`;
};

export function createMediaServiceFromAdapter(
  input: CreateMediaServiceInput,
): MediaService {
  const defaultAccess = input.defaultAccess ?? "public";
  const defaultGetExpiresInSeconds = input.defaultGetExpiresInSeconds ?? 900;
  const uploadUrl = input.uploadUrl ?? "/media/upload";

  return {
    rawAdapter: input.adapter,

    async prepareUpload(prepareInput) {
      ensureValidInput(prepareInput);
      const access = prepareInput.access ?? defaultAccess;
      const key = buildObjectKey(prepareInput, access);

      return {
        // Uploads are always handled by the API upload endpoint.
        url: uploadUrl,
        headers: {
          "Content-Type": prepareInput.mime,
        },
        key,
        access,
      };
    },

    async finalizeUpload(finalizeInput) {
      if (!finalizeInput.key?.trim()) {
        throw new MediaErrorInvalidData("key is required");
      }

      const access = finalizeInput.access ?? defaultAccess;

      try {
        const head = await input.adapter.headObject({
          key: finalizeInput.key,
          access,
        });

        return {
          key: finalizeInput.key,
          access,
          size: head.size,
          mime: head.mime,
          etag: head.etag,
          publicUrl: input.adapter.publicUrl({
            key: finalizeInput.key,
            access,
          }),
        };
      } catch (error) {
        throw new MediaErrorNotFound("Media object not found", error);
      }
    },

    async getMediaUrl(getInput) {
      if (!getInput.key?.trim()) {
        throw new MediaErrorInvalidData("key is required");
      }

      const access = getInput.access ?? defaultAccess;
      const publicUrl = input.adapter.publicUrl({ key: getInput.key, access });

      if (publicUrl) {
        return {
          key: getInput.key,
          access,
          url: publicUrl,
          expiresAt: null,
          isPublic: true,
        };
      }

      try {
        const signed = await input.adapter.createPresignedGet({
          key: getInput.key,
          access,
          expiresInSeconds:
            getInput.expiresInSeconds ?? defaultGetExpiresInSeconds,
        });

        return {
          key: getInput.key,
          access,
          url: signed.url,
          expiresAt: signed.expiresAt,
          isPublic: false,
        };
      } catch (error) {
        throw new MediaErrorUnknown("Failed to create media URL", error);
      }
    },
  };
}
