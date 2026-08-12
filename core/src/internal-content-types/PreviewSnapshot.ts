import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";

export const PreviewSnapshot = new ContentType({
  name: "PreviewSnapshot",
  fields: {
    tokenHash: Fields.string().required(),
    contentType: Fields.string().required(),
    documentId: Fields.string().type("Id").optional(),
    routeId: Fields.string().type("Id").required(),
    languageCode: Fields.string().required(),
    path: Fields.string().required(),
    data: Fields.string().required(),
    templatePayload: Fields.string().optional(),
    createdBy: Fields.string().type("Id").required(),
    expiresAt: Fields.date().type("DateTime").required(),
  },
}).hideFromManager();

export type PreviewSnapshot = typeof PreviewSnapshot;
export type PreviewSnapshotManager = DBOutput<PreviewSnapshot>;
