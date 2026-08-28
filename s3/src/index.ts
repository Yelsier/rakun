import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";

import type {
  MediaAccess,
  MediaServiceConfig,
  StorageAdapter,
} from "@rakun-kit/core";
import { Logger } from "@rakun-kit/core/logger";

export type S3MediaServiceConfig = {
  region: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  publicBucket: string;
  privateBucket: string;
  baseUrl?: string;
  uploadUrl?: string;
  publicBaseUrl?: string;
  publicCacheControl?: string;
  putExpiresInSeconds?: number;
  getExpiresInSeconds?: number;
  defaultAccess?: MediaAccess;
};

const toWebStream = (body: unknown): ReadableStream<Uint8Array> => {
  if (body instanceof ReadableStream) {
    return body;
  }

  if (
    body &&
    typeof body === "object" &&
    "transformToWebStream" in body &&
    typeof body.transformToWebStream === "function"
  ) {
    return body.transformToWebStream() as ReadableStream<Uint8Array>;
  }

  if (body instanceof Readable) {
    return Readable.toWeb(body) as ReadableStream<Uint8Array>;
  }

  if (body instanceof Uint8Array) {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(body);
        controller.close();
      },
    });
  }

  if (
    body &&
    typeof body === "object" &&
    Symbol.asyncIterator in body &&
    typeof body[Symbol.asyncIterator] === "function"
  ) {
    return Readable.toWeb(
      Readable.from(body as AsyncIterable<Uint8Array>),
    ) as ReadableStream<Uint8Array>;
  }

  throw new Error("Unsupported S3 response body");
};

const encodePathForUrl = (value: string): string =>
  value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

export class S3Adapter implements StorageAdapter {
  private readonly s3: S3Client;

  constructor(
    private readonly cfg: {
      region: string;
      endpoint?: string;
      forcePathStyle?: boolean;
      publicBucket: string;
      privateBucket: string;
      publicBaseUrl?: string;
      publicCacheControl?: string;
      putExpiresInSeconds?: number;
      getExpiresInSeconds?: number;
    },
  ) {
    this.s3 = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint,
      forcePathStyle: cfg.forcePathStyle ?? Boolean(cfg.endpoint),
    });
  }

  private bucket(access: MediaAccess) {
    return access === "public" ? this.cfg.publicBucket : this.cfg.privateBucket;
  }

  private cacheControl(access: MediaAccess) {
    if (access !== "public") return undefined;
    return this.cfg.publicCacheControl;
  }

  private async signUrl(command: unknown, expiresIn: number) {
    const signer = getSignedUrl as unknown as (
      client: unknown,
      command: unknown,
      options: { expiresIn: number },
    ) => Promise<string>;

    return signer(this.s3, command, { expiresIn });
  }

  async createPresignedPut(input: {
    key: string;
    mime: string;
    size: number;
    access: MediaAccess;
  }) {
    const Bucket = this.bucket(input.access);
    Logger.addTrace("s3.media.createPresignedPut: start", {
      bucket: Bucket,
      key: input.key,
      access: input.access,
      mime: input.mime,
      size: input.size,
    });

    const cmd = new PutObjectCommand({
      Bucket,
      Key: input.key,
      ContentType: input.mime,
      ContentLength: input.size,
      CacheControl: this.cacheControl(input.access),
    });

    try {
      const url = await this.signUrl(cmd, this.cfg.putExpiresInSeconds ?? 900);
      Logger.addTrace("s3.media.createPresignedPut: signed", {
        bucket: Bucket,
        key: input.key,
      });

      return {
        url,
        key: input.key,
        headers: {
          "Content-Type": input.mime,
          ...(this.cacheControl(input.access)
            ? { "Cache-Control": this.cacheControl(input.access)! }
            : {}),
        },
      };
    } catch (error) {
      Logger.error("s3.media.createPresignedPut failed", {
        bucket: Bucket,
        key: input.key,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async putObject(input: {
    key: string;
    mime: string;
    content: Uint8Array;
    access: MediaAccess;
  }) {
    const Bucket = this.bucket(input.access);
    Logger.addTrace("s3.media.putObject: start", {
      bucket: Bucket,
      key: input.key,
      access: input.access,
      mime: input.mime,
      size: input.content.length,
    });
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket,
          Key: input.key,
          Body: input.content,
          ContentType: input.mime,
          ContentLength: input.content.length,
          CacheControl: this.cacheControl(input.access),
        }),
      );
      Logger.addTrace("s3.media.putObject: success", {
        bucket: Bucket,
        key: input.key,
      });
    } catch (error) {
      Logger.error("s3.media.putObject failed", {
        bucket: Bucket,
        key: input.key,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async headObject(input: { key: string; access: MediaAccess }) {
    const Bucket = this.bucket(input.access);
    Logger.addTrace("s3.media.headObject: start", {
      bucket: Bucket,
      key: input.key,
      access: input.access,
    });
    try {
      const out = await this.s3.send(
        new HeadObjectCommand({ Bucket, Key: input.key }),
      );
      Logger.addTrace("s3.media.headObject: success", {
        bucket: Bucket,
        key: input.key,
        size: out.ContentLength ?? 0,
        mime: out.ContentType,
      });
      return {
        size: out.ContentLength ?? 0,
        mime: out.ContentType,
        etag: out.ETag,
      };
    } catch (error) {
      Logger.error("s3.media.headObject failed", {
        bucket: Bucket,
        key: input.key,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async createPresignedGet(input: {
    key: string;
    access: MediaAccess;
    expiresInSeconds: number;
  }) {
    const Bucket = this.bucket(input.access);
    Logger.addTrace("s3.media.createPresignedGet: start", {
      bucket: Bucket,
      key: input.key,
      access: input.access,
      expiresInSeconds: input.expiresInSeconds,
    });
    const cmd = new GetObjectCommand({ Bucket, Key: input.key });
    try {
      const url = await this.signUrl(cmd, input.expiresInSeconds);
      const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000);
      Logger.addTrace("s3.media.createPresignedGet: signed", {
        bucket: Bucket,
        key: input.key,
        expiresAt,
      });
      return { url, expiresAt };
    } catch (error) {
      Logger.error("s3.media.createPresignedGet failed", {
        bucket: Bucket,
        key: input.key,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async getPublicObject(input: {
    key: string;
    method: "GET" | "HEAD";
    range?: string;
  }) {
    const Bucket = this.bucket("public");
    const command =
      input.method === "HEAD"
        ? new HeadObjectCommand({ Bucket, Key: input.key })
        : new GetObjectCommand({
            Bucket,
            Key: input.key,
            Range: input.range,
          });
    const output = await this.s3.send(command);

    return {
      acceptRanges: output.AcceptRanges,
      body:
        input.method === "GET" && "Body" in output && output.Body
          ? toWebStream(output.Body)
          : undefined,
      cacheControl: output.CacheControl,
      contentDisposition: output.ContentDisposition,
      contentEncoding: output.ContentEncoding,
      contentLanguage: output.ContentLanguage,
      contentLength: output.ContentLength,
      contentRange: "ContentRange" in output ? output.ContentRange : undefined,
      contentType: output.ContentType,
      etag: output.ETag,
      expires: output.Expires,
      lastModified: output.LastModified,
      status:
        output.$metadata.httpStatusCode ||
        ("ContentRange" in output && output.ContentRange ? 206 : 200),
    };
  }

  async deleteObject(input: { key: string; access: MediaAccess }) {
    const Bucket = this.bucket(input.access);
    Logger.addTrace("s3.media.deleteObject: start", {
      bucket: Bucket,
      key: input.key,
      access: input.access,
    });
    try {
      await this.s3.send(new DeleteObjectCommand({ Bucket, Key: input.key }));
      Logger.addTrace("s3.media.deleteObject: success", {
        bucket: Bucket,
        key: input.key,
      });
    } catch (error) {
      Logger.error("s3.media.deleteObject failed", {
        bucket: Bucket,
        key: input.key,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  publicUrl(input: { key: string; access: MediaAccess }) {
    if (input.access !== "public") return null;
    if (!this.cfg.publicBaseUrl) return null;
    const relativeToPublic = input.key.startsWith("public/")
      ? input.key.slice("public/".length)
      : input.key;
    return `${this.cfg.publicBaseUrl.replace(/\/$/, "")}/${encodePathForUrl(relativeToPublic)}`;
  }
}

const joinUrlPath = (baseUrl: string, pathname: string): string =>
  `${baseUrl.replace(/\/$/, "")}/${pathname.replace(/^\/+/, "")}`;

export const createS3MediaServiceConfig = (
  config: S3MediaServiceConfig,
): MediaServiceConfig => {
  const uploadUrl =
    config.uploadUrl ??
    (config.baseUrl ? joinUrlPath(config.baseUrl, "/media/upload") : undefined);
  const publicBaseUrl =
    config.publicBaseUrl ??
    (config.baseUrl ? joinUrlPath(config.baseUrl, "/media") : undefined);

  return {
    adapter: new S3Adapter({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      publicBucket: config.publicBucket,
      privateBucket: config.privateBucket,
      publicBaseUrl,
      publicCacheControl: config.publicCacheControl,
      putExpiresInSeconds: config.putExpiresInSeconds,
      getExpiresInSeconds: config.getExpiresInSeconds,
    }),
    defaultAccess: config.defaultAccess,
    defaultGetExpiresInSeconds: config.getExpiresInSeconds,
    uploadUrl,
  };
};
