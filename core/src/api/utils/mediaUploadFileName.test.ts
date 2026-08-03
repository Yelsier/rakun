import { describe, expect, it } from "bun:test";

import {
  decodeMediaUploadFileName,
  MEDIA_UPLOAD_FILE_NAME_ENCODING,
} from "./mediaUploadFileName";

describe("media upload file name headers", () => {
  it("restores Unicode names encoded for HTTP headers", () => {
    const fileName = "diseño 東京 😀.png";

    expect(
      decodeMediaUploadFileName(
        encodeURIComponent(fileName),
        MEDIA_UPLOAD_FILE_NAME_ENCODING,
      ),
    ).toBe(fileName);
  });

  it("preserves raw names from older manager clients", () => {
    expect(decodeMediaUploadFileName("100%20real.png", undefined)).toBe(
      "100%20real.png",
    );
  });

  it("does not fail the upload when an encoded value is malformed", () => {
    expect(
      decodeMediaUploadFileName("incomplete%2.png", MEDIA_UPLOAD_FILE_NAME_ENCODING),
    ).toBe("incomplete%2.png");
  });
});
