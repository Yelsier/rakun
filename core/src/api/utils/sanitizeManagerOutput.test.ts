import { describe, expect, it } from "bun:test";

import ContentType from "../../lib/ContentType";
import { Fields } from "../../lib/fields";
import { sanitizeManagerOutput } from "./sanitizeManagerOutput";

const SecretContent = new ContentType({
  name: "SecretOutputTest",
  fields: {
    title: Fields.string(),
    password: Fields.string().type("Password"),
    nested: Fields.string(),
  },
});

describe("sanitizeManagerOutput", () => {
  it("removes password fields and sensitive keys from manager payloads", () => {
    const sanitized = sanitizeManagerOutput(
      {
        _id: "id",
        _type: "SecretOutputTest",
        title: "Visible",
        password: "secret",
        apiToken: "token",
        nested: {
          keep: true,
          challenge: "challenge",
        },
      },
      SecretContent,
    );

    expect(sanitized).toEqual({
      _id: "id",
      _type: "SecretOutputTest",
      title: "Visible",
      nested: {
        keep: true,
      },
    });
  });

  it("preserves dates so JSON responses serialize them as ISO strings", () => {
    const date = new Date("2026-08-08T00:00:00.000Z");
    const dateTime = new Date("2026-08-08T16:05:00.000Z");
    const sanitized = sanitizeManagerOutput({ date, nested: { dateTime } });

    expect(sanitized).toEqual({ date, nested: { dateTime } });
    expect(JSON.parse(JSON.stringify(sanitized))).toEqual({
      date: "2026-08-08T00:00:00.000Z",
      nested: { dateTime: "2026-08-08T16:05:00.000Z" },
    });
  });
});

