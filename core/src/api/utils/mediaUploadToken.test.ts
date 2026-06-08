import { describe, expect, it } from "bun:test";

import {
  createMediaUploadToken,
  verifyMediaUploadToken,
} from "./mediaUploadToken";

describe("media upload tokens", () => {
  it("verifies signed upload metadata and rejects tampered tokens", () => {
    process.env.RAKUN_MEDIA_UPLOAD_SECRET = "test-secret";

    const token = createMediaUploadToken({
      key: "private/uploads/file.txt",
      access: "private",
      mime: "text/plain",
      size: 12,
      userId: "user-id",
    });

    expect(verifyMediaUploadToken(token)).toMatchObject({
      key: "private/uploads/file.txt",
      access: "private",
      mime: "text/plain",
      size: 12,
      userId: "user-id",
    });
    expect(verifyMediaUploadToken(`${token}x`)).toBeNull();
  });
});

