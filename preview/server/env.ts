import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

export const previewDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

dotenv.config({
  path: path.join(previewDir, ".env"),
});

const readEnv = (name: string, fallback: string) =>
  process.env[name] && process.env[name]!.length > 0
    ? process.env[name]!
    : fallback;

export const env = {
  mongoUri: readEnv("MONGO_URI", "mongodb://localhost:27017/rakun_preview"),
  port: Number(readEnv("PORT", "4100")),
  apiBasePath: readEnv("API_BASE_PATH", "/api/rakun"),
  managerBasePath: readEnv("MANAGER_BASE_PATH", "/backend"),
  mediaDir: path.resolve(previewDir, readEnv("RAKUN_MEDIA_DIR", ".rakun/media")),
  mediaTokenSecret: readEnv(
    "RAKUN_MEDIA_TOKEN_SECRET",
    "dev-local-token-secret",
  ),
  seedPreview: readEnv("SEED_PREVIEW", "true") !== "false",
  adminEmail: readEnv("PREVIEW_ADMIN_EMAIL", "admin@example.com"),
  adminPassword: readEnv("PREVIEW_ADMIN_PASSWORD", "admin123"),
  adminName: readEnv("PREVIEW_ADMIN_NAME", "Preview Admin"),
};
