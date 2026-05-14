import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";

export const BackupDocument = new ContentType({
  name: "BackupDocument",
  fields: {
    backupId: Fields.string().type("Id").required(),
    contentType: Fields.string().required(),
    documentId: Fields.string().required(),
    document: Fields.string().type("RichText").required(),
  },
}).hideFromManager();

export type BackupDocument = typeof BackupDocument;
export type BackupDocumentManager = DBOutput<BackupDocument>;
