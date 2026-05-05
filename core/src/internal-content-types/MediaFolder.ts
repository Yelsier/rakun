import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DBOutput } from "../lib/types";

export const MediaFolder = new ContentType({
  name: "MediaFolder",
  fields: {
    name: Fields.string().required(),
    slug: Fields.string().type("Slug").required(),
    path: Fields.string().required(),
    parent: Fields.selfRelation(),
    description: Fields.string().type("Textarea"),
  },
  uniques: [["path"]],
}).hideFromManager();

export type MediaFolder = typeof MediaFolder;
export type MediaFolderSchema = DataFront<MediaFolder>;
export type MediaFolderManager = DBOutput<MediaFolder>;
