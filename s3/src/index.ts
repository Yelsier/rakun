import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { MediaAccess, MediaServiceConfig, StorageAdapter } from "@rakun-kit/core";

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

    const cmd = new PutObjectCommand({
      Bucket,
      Key: input.key,
      ContentType: input.mime,
      ContentLength: input.size,
      CacheControl: this.cacheControl(input.access),
    });

    const url = await this.signUrl(cmd, this.cfg.putExpiresInSeconds ?? 900);

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
  }

  async putObject(input: {
    key: string;
    mime: string;
    content: Uint8Array;
    access: MediaAccess;
  }) {
    const Bucket = this.bucket(input.access);
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
  }

  async headObject(input: { key: string; access: MediaAccess }) {
    const Bucket = this.bucket(input.access);
    const out = await this.s3.send(
      new HeadObjectCommand({ Bucket, Key: input.key }),
    );
    return {
      size: out.ContentLength ?? 0,
      mime: out.ContentType,
      etag: out.ETag,
    };
  }

  async createPresignedGet(input: {
    key: string;
    access: MediaAccess;
    expiresInSeconds: number;
  }) {
    const Bucket = this.bucket(input.access);
    const cmd = new GetObjectCommand({ Bucket, Key: input.key });
    const url = await this.signUrl(cmd, input.expiresInSeconds);
    const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000);
    return { url, expiresAt };
  }

  async deleteObject(input: { key: string; access: MediaAccess }) {
    const Bucket = this.bucket(input.access);
    await this.s3.send(new DeleteObjectCommand({ Bucket, Key: input.key }));
  }

  publicUrl(input: { key: string; access: MediaAccess }) {
    if (input.access !== "public") return null;
    if (!this.cfg.publicBaseUrl) return null;
    return `${this.cfg.publicBaseUrl.replace(/\/$/, "")}/${input.key}`;
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

  return {
    adapter: new S3Adapter({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      publicBucket: config.publicBucket,
      privateBucket: config.privateBucket,
      publicBaseUrl: config.publicBaseUrl,
      publicCacheControl: config.publicCacheControl,
      putExpiresInSeconds: config.putExpiresInSeconds,
      getExpiresInSeconds: config.getExpiresInSeconds,
    }),
    defaultAccess: config.defaultAccess,
    defaultGetExpiresInSeconds: config.getExpiresInSeconds,
    uploadUrl,
  };
};
