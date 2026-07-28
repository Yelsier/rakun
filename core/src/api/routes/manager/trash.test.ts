import { describe, expect, it } from "bun:test";

import ContentType from "../../../lib/ContentType";
import { Fields } from "../../../lib/fields";
import { buildTrashUpdate } from "./trash";

const Page = new ContentType({
  name: "TrashVariantPage",
  fields: {
    title: Fields.string().required(),
  },
}).enableDocumentVisibility();

describe("buildTrashUpdate", () => {
  it("preserves each variant visibility for group restoration", () => {
    const trashedAt = new Date();
    const published = buildTrashUpdate({
      contentType: Page,
      document: {
        _id: "primary",
        _visibility: "published",
      },
      userId: "user-id",
    });
    const draft = buildTrashUpdate({
      contentType: Page,
      document: {
        _id: "variant",
        _visibility: "draft",
      },
      userId: "user-id",
    });

    expect(published).toMatchObject({
      _trashed: true,
      _visibility: "trash",
      _visibilityBeforeTrash: "published",
      trashedBy: "user-id",
    });
    expect(draft).toMatchObject({
      _trashed: true,
      _visibility: "trash",
      _visibilityBeforeTrash: "draft",
      trashedBy: "user-id",
    });
    expect(published.trashedAt).toBeInstanceOf(Date);
    expect(published.trashedAt.getTime()).toBeGreaterThanOrEqual(
      trashedAt.getTime(),
    );
  });
});
