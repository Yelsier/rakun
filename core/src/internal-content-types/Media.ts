import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DBOutput } from "../lib/types";
import { MediaFolder } from "./MediaFolder";

export const Media = new ContentType({
  name: "Media",
  fields: {
    name: Fields.string().required(),
    originalName: Fields.string().required(),
    key: Fields.string().required(),
    access: Fields.select(["public", "private"]).required(),
    mime: Fields.string().required(),
    extension: Fields.string(),
    size: Fields.number().required().min(0),
    etag: Fields.string(),
    url: Fields.string().type("Url"),
    previewKey: Fields.string(),
    previewUrl: Fields.string().type("Url"),
    previewMime: Fields.string(),
    width: Fields.number().min(1),
    height: Fields.number().min(1),
    orientation: Fields.select(["portrait", "landscape"]),
    optimized: Fields.boolean(),
    optimizedFormat: Fields.string(),
    optimizationQuality: Fields.number().min(1).max(100),
    originalSize: Fields.number().min(0),
    folder: Fields.relation(MediaFolder, "existing"),
    uploadedAt: Fields.date().type("DateTime").required(),
    status: Fields.select(["uploaded", "archived", "deleted"]).required(),
  },
  uniques: [["key"]],
}).hideFromManager();

export type Media = typeof Media;
export type MediaSchema = DataFront<Media>;
export type MediaManager = DBOutput<Media>;
