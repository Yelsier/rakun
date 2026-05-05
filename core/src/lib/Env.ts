import path from "node:path";
import { LEVEL_KEY } from "./Logger";

type MediaProvider = "s3" | "local";

type BaseEnvConfig = {
  port: number;
  corsOrigin: string;
  logLevel: LEVEL_KEY;
  mongoUri: string;
  webRevalidateUrl?: string;
  webRevalidateToken?: string;
  mediaPublicBaseUrl?: string;
  mediaPublicCacheControl?: string;
  mediaPutExpiresInSeconds: number;
  mediaGetExpiresInSeconds: number;
};

type S3MediaConfig = {
  provider: "s3";
  region: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  publicBucket: string;
  privateBucket: string;
};

type LocalMediaConfig = {
  provider: "local";
  rootDir: string;
  baseUrl: string;
  tokenSecret: string;
};

export type ApiEnvConfig = BaseEnvConfig & {
  media: S3MediaConfig | LocalMediaConfig;
};

const DEFAULT_PORT = 4000;

const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
  envName: string,
): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${envName} must be a positive integer`);
  }
  return parsed;
};

const required = (value: string | undefined, envName: string): string => {
  if (!value?.trim()) {
    throw new Error(`${envName} is required`);
  }
  return value;
};

const optionalTrimmed = (value: string | undefined): string | undefined => {
  return value?.trim();
};

const parseMediaProvider = (value: string | undefined): MediaProvider => {
  if (!value || value === "s3") return "s3";
  if (value === "local") return "local";
  throw new Error(`Unsupported MEDIA_PROVIDER: ${value}`);
};

const parseOptionalBoolean = (
  value: string | undefined,
  envName: string,
): boolean | undefined => {
  if (value == null || value.trim() === "") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  throw new Error(`${envName} must be one of: true, false, 1, 0`);
};

export const loadApiEnv = (): ApiEnvConfig => {
  const port = parsePositiveInt(process.env.PORT, DEFAULT_PORT, "PORT");
  const mediaProvider = parseMediaProvider(process.env.MEDIA_PROVIDER);

  const base: BaseEnvConfig = {
    port,
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
    logLevel: (process.env.LOG_LEVEL as LEVEL_KEY) || "debug",
    mongoUri: required(process.env.MONGODB_URI, "MONGODB_URI"),
    webRevalidateUrl: optionalTrimmed(process.env.WEB_REVALIDATE_URL),
    webRevalidateToken: optionalTrimmed(process.env.WEB_REVALIDATE_TOKEN),
    mediaPublicBaseUrl: optionalTrimmed(process.env.MEDIA_PUBLIC_BASE_URL),
    mediaPublicCacheControl:
      optionalTrimmed(process.env.MEDIA_PUBLIC_CACHE_CONTROL) ||
      "public, max-age=31536000, immutable",
    mediaPutExpiresInSeconds: parsePositiveInt(
      process.env.MEDIA_PUT_EXPIRES_IN_SECONDS,
      900,
      "MEDIA_PUT_EXPIRES_IN_SECONDS",
    ),
    mediaGetExpiresInSeconds: parsePositiveInt(
      process.env.MEDIA_GET_EXPIRES_IN_SECONDS,
      900,
      "MEDIA_GET_EXPIRES_IN_SECONDS",
    ),
  };

  if (mediaProvider === "local") {
    return {
      ...base,
      media: {
        provider: "local",
        rootDir:
          process.env.MEDIA_LOCAL_ROOT || path.resolve(process.cwd(), ".media"),
        baseUrl: process.env.MEDIA_LOCAL_BASE_URL || `http://localhost:${port}`,
        tokenSecret:
          process.env.MEDIA_LOCAL_TOKEN_SECRET ||
          "change-me-local-media-secret",
      },
    };
  }

  return {
    ...base,
    media: {
      provider: "s3",
      region: process.env.MEDIA_S3_REGION || "eu-west-1",
      endpoint: process.env.MEDIA_S3_ENDPOINT,
      forcePathStyle: parseOptionalBoolean(
        process.env.MEDIA_S3_FORCE_PATH_STYLE,
        "MEDIA_S3_FORCE_PATH_STYLE",
      ),
      publicBucket: required(
        process.env.MEDIA_S3_PUBLIC_BUCKET,
        "MEDIA_S3_PUBLIC_BUCKET",
      ),
      privateBucket: required(
        process.env.MEDIA_S3_PRIVATE_BUCKET,
        "MEDIA_S3_PRIVATE_BUCKET",
      ),
    },
  };
};
