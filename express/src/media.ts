import { createHmac } from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";

import type {
  MediaAccess,
  MediaServiceConfig,
  StorageAdapter,
} from "@rakun/core";

export type LocalMediaServiceConfig = {
  rootDir: string;
  baseUrl: string;
  tokenSecret: string;
  publicBaseUrl?: string;
  putExpiresInSeconds?: number;
  getExpiresInSeconds?: number;
  defaultAccess?: MediaAccess;
};

export type LocalAdapterResponse = NodeJS.WritableStream & {
  statusCode?: number;
  setHeader: (name: string, value: string | string[]) => void;
  end: (chunk?: string | Uint8Array) => void;
};

type SignedPutPayload = {
  op: "put";
  key: string;
  mime: string;
  size: number;
  exp: number;
};

type SignedGetPayload = {
  op: "get";
  key: string;
  exp: number;
};

type SignedPayload = SignedPutPayload | SignedGetPayload;

type StoredMeta = {
  mime?: string;
  etag?: string;
};

type LocalMediaHttpHandlers = {
  handleUpload: (
    req: NodeJS.ReadableStream,
    res: LocalAdapterResponse,
    token: string,
  ) => Promise<void>;
  handlePrivateGet: (
    res: LocalAdapterResponse,
    token: string,
  ) => Promise<void>;
  getPublicRootDir: () => string;
};

const LOCAL_MEDIA_SERVICE_CONFIG_KEY = "__rakunExpressLocalMediaConfig";

type LocalMediaBootstrapConfig = MediaServiceConfig & {
  [LOCAL_MEDIA_SERVICE_CONFIG_KEY]: LocalMediaServiceConfig;
};

const toBase64Url = (value: string): string =>
  Buffer.from(value).toString("base64url");

const fromBase64Url = (value: string): string =>
  Buffer.from(value, "base64url").toString("utf8");

const encodePathForUrl = (value: string): string =>
  value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const joinUrlPath = (baseUrl: string, pathname: string): string =>
  `${baseUrl.replace(/\/$/, "")}/${pathname.replace(/^\/+/, "")}`;

export class LocalAdapter implements StorageAdapter {
  private readonly rootDir: string;
  private readonly baseUrl: string;
  private readonly publicBaseUrl: string;

  constructor(
    private readonly cfg: {
      rootDir: string;
      baseUrl: string;
      tokenSecret: string;
      publicBaseUrl?: string;
      putExpiresInSeconds?: number;
      getExpiresInSeconds?: number;
    },
  ) {
    this.rootDir = path.resolve(cfg.rootDir);
    this.baseUrl = cfg.baseUrl.replace(/\/$/, "");
    this.publicBaseUrl = (cfg.publicBaseUrl || cfg.baseUrl).replace(/\/$/, "");
  }

  async createPresignedPut(input: {
    key: string;
    mime: string;
    size: number;
    access: MediaAccess;
  }) {
    const expiresIn = this.cfg.putExpiresInSeconds ?? 900;
    const exp = Math.floor(Date.now() / 1000) + expiresIn;
    const token = this.signPayload({
      op: "put",
      key: input.key,
      mime: input.mime,
      size: input.size,
      exp,
    });

    return {
      url: `${this.baseUrl}/media/local/upload/${token}`,
      key: input.key,
      headers: {
        "Content-Type": input.mime,
      },
    };
  }

  async putObject(input: {
    key: string;
    mime: string;
    content: Uint8Array;
    access: MediaAccess;
  }) {
    const objectPath = this.resolveObjectPath(input.key);
    const dir = path.dirname(objectPath);
    await mkdir(dir, { recursive: true });
    await writeFile(objectPath, input.content);
    await this.writeMeta(input.key, {
      mime: input.mime,
    });
  }

  async headObject(input: { key: string; access: MediaAccess }) {
    const objectPath = this.resolveObjectPath(input.key);
    const objectStats = await stat(objectPath);
    const meta = await this.readMeta(input.key);

    return {
      size: objectStats.size,
      mime: meta?.mime,
      etag: meta?.etag,
    };
  }

  async createPresignedGet(input: {
    key: string;
    access: MediaAccess;
    expiresInSeconds: number;
  }) {
    const exp = Math.floor(Date.now() / 1000) + input.expiresInSeconds;
    const token = this.signPayload({
      op: "get",
      key: input.key,
      exp,
    });

    return {
      url: `${this.baseUrl}/media/local/private/${token}`,
      expiresAt: new Date(exp * 1000),
    };
  }

  async deleteObject(input: { key: string; access: MediaAccess }) {
    const objectPath = this.resolveObjectPath(input.key);
    await rm(objectPath, { force: true });
    await rm(this.metaPath(input.key), { force: true });
  }

  publicUrl(input: { key: string; access: MediaAccess }) {
    if (input.access !== "public") return null;

    const relativeToPublic = input.key.startsWith("public/")
      ? input.key.slice("public/".length)
      : input.key;

    return `${this.publicBaseUrl}/media/public/${encodePathForUrl(relativeToPublic)}`;
  }

  async handleUpload(
    req: NodeJS.ReadableStream,
    res: LocalAdapterResponse,
    token: string,
  ): Promise<void> {
    let payload: SignedPutPayload;

    try {
      const verified = this.verifyPayload(token);
      if (verified.op !== "put") {
        res.statusCode = 400;
        res.end("Invalid upload token");
        return;
      }
      payload = verified;
    } catch {
      res.statusCode = 400;
      res.end("Invalid or expired upload token");
      return;
    }

    const objectPath = this.resolveObjectPath(payload.key);
    const dir = path.dirname(objectPath);
    await mkdir(dir, { recursive: true });

    const tmpPath = `${objectPath}.tmp-${Date.now()}`;
    const writeStream = createWriteStream(tmpPath);

    try {
      await pipeline(req, writeStream);
    } catch {
      await rm(tmpPath, { force: true });
      res.statusCode = 500;
      res.end("Failed to store file");
      return;
    }

    try {
      const fileStat = await stat(tmpPath);
      if (fileStat.size !== payload.size) {
        await rm(tmpPath, { force: true });
        res.statusCode = 400;
        res.end("Uploaded size mismatch");
        return;
      }

      await rename(tmpPath, objectPath);
      await this.writeMeta(payload.key, {
        mime: payload.mime,
      });

      res.statusCode = 200;
      res.end();
    } catch {
      await rm(tmpPath, { force: true });
      res.statusCode = 500;
      res.end("Failed to finalize file upload");
    }
  }

  async handlePrivateGet(
    res: LocalAdapterResponse,
    token: string,
  ): Promise<void> {
    let payload: SignedGetPayload;

    try {
      const verified = this.verifyPayload(token);
      if (verified.op !== "get") {
        res.statusCode = 400;
        res.end("Invalid token");
        return;
      }
      payload = verified;
    } catch {
      res.statusCode = 400;
      res.end("Invalid or expired token");
      return;
    }

    try {
      const objectPath = this.resolveObjectPath(payload.key);
      const meta = await this.readMeta(payload.key);
      if (meta?.mime) {
        res.setHeader("Content-Type", meta.mime);
      }
      await pipeline(createReadStream(objectPath), res);
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  }

  getPublicRootDir(): string {
    return path.join(this.rootDir, "public");
  }

  private signPayload(payload: SignedPayload): string {
    const encoded = toBase64Url(JSON.stringify(payload));
    const signature = this.sign(encoded);
    return `${encoded}.${signature}`;
  }

  private verifyPayload(token: string): SignedPayload {
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) throw new Error("Invalid token");

    const expected = this.sign(encoded);
    if (signature !== expected) {
      throw new Error("Invalid signature");
    }

    const parsed = JSON.parse(fromBase64Url(encoded)) as SignedPayload;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      throw new Error("Expired token");
    }

    return parsed;
  }

  private sign(data: string): string {
    return createHmac("sha256", this.cfg.tokenSecret)
      .update(data)
      .digest("base64url");
  }

  private normalizeKey(key: string): string {
    const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");

    if (
      !normalized ||
      normalized.split("/").some((segment) => segment === "..")
    ) {
      throw new Error("Invalid key");
    }

    return normalized;
  }

  private resolveObjectPath(key: string): string {
    const normalized = this.normalizeKey(key);
    const objectPath = path.resolve(this.rootDir, normalized);

    if (!objectPath.startsWith(`${this.rootDir}${path.sep}`)) {
      throw new Error("Invalid key path");
    }

    return objectPath;
  }

  private metaPath(key: string): string {
    return `${this.resolveObjectPath(key)}.meta.json`;
  }

  private async writeMeta(key: string, meta: StoredMeta): Promise<void> {
    await writeFile(this.metaPath(key), JSON.stringify(meta), "utf8");
  }

  private async readMeta(key: string): Promise<StoredMeta | undefined> {
    try {
      const value = await readFile(this.metaPath(key), "utf8");
      return JSON.parse(value) as StoredMeta;
    } catch {
      return undefined;
    }
  }
}

export const createLocalMediaServiceConfig = (
  config: LocalMediaServiceConfig,
): MediaServiceConfig => {
  const mediaConfig: MediaServiceConfig = {
    adapter: new LocalAdapter({
      rootDir: config.rootDir,
      baseUrl: config.baseUrl,
      tokenSecret: config.tokenSecret,
      publicBaseUrl: config.publicBaseUrl,
      putExpiresInSeconds: config.putExpiresInSeconds,
      getExpiresInSeconds: config.getExpiresInSeconds,
    }),
    defaultAccess: config.defaultAccess,
    defaultGetExpiresInSeconds: config.getExpiresInSeconds,
    uploadUrl: joinUrlPath(config.baseUrl, "/media/upload"),
  };

  Object.defineProperty(mediaConfig, LOCAL_MEDIA_SERVICE_CONFIG_KEY, {
    value: config,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return mediaConfig;
};

export const createLocalMediaHttpHandlers = (
  config: LocalMediaServiceConfig,
): LocalMediaHttpHandlers => {
  const localAdapter = new LocalAdapter({
    rootDir: config.rootDir,
    baseUrl: config.baseUrl,
    tokenSecret: config.tokenSecret,
    publicBaseUrl: config.publicBaseUrl,
    putExpiresInSeconds: config.putExpiresInSeconds,
    getExpiresInSeconds: config.getExpiresInSeconds,
  });

  return {
    handleUpload: (req, res, token) => localAdapter.handleUpload(req, res, token),
    handlePrivateGet: (res, token) => localAdapter.handlePrivateGet(res, token),
    getPublicRootDir: () => localAdapter.getPublicRootDir(),
  };
};

export const getLocalMediaServiceConfig = (
  media: MediaServiceConfig | undefined,
): LocalMediaServiceConfig | null => {
  if (!media) {
    return null;
  }

  const config = (media as Partial<LocalMediaBootstrapConfig>)[
    LOCAL_MEDIA_SERVICE_CONFIG_KEY
  ];

  return config ?? null;
};
