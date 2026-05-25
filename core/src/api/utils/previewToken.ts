import { createHash } from "crypto";

export const hashPreviewToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
