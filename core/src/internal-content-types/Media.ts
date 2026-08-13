import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DBOutput } from "../lib/types";
import { MediaFolder } from "./MediaFolder";

export const Media = new ContentType({
  name: "Media",
  permissions: "Media",
  fields: {
    name: Fields.string().required(),
    title: Fields.string().optional(),
    alt: Fields.string().optional(),
    originalName: Fields.string().required(),
    key: Fields.string().required(),
    access: Fields.select(["public", "private"]).required(),
    mime: Fields.string().required(),
    extension: Fields.string().optional(),
    size: Fields.number().required().min(0),
    etag: Fields.string().optional(),
    url: Fields.string().type("Url").optional(),
    previewKey: Fields.string().optional(),
    previewUrl: Fields.string().type("Url").optional(),
    previewMime: Fields.string().optional(),
    sizes: Fields.array(Fields.string().type("RichText")).optional(),
    sources: Fields.array(Fields.string().type("RichText")).optional(),
    width: Fields.number().min(1).optional(),
    height: Fields.number().min(1).optional(),
    orientation: Fields.select(["portrait", "landscape"]).optional(),
    optimized: Fields.boolean().optional(),
    optimizedFormat: Fields.string().optional(),
    optimizationQuality: Fields.number().min(1).max(100).optional(),
    originalSize: Fields.number().min(0).optional(),
    folder: Fields.relation(MediaFolder, "existing").optional(),
    uploadedAt: Fields.date().type("DateTime").required(),
    status: Fields.select(["uploaded", "archived", "deleted"]).required(),
  },
  uniques: [["key"]],
}).hideFromManager();

export type Media = typeof Media;
export type MediaSchema = DataFront<Media>;
export type MediaManager = DBOutput<Media>;
