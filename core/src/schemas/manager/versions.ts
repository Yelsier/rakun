import z from "zod";

const dateLike = z.union([z.date(), z.string()]);

export const versionDiffEntry = z.object({
  path: z.string(),
  before: z.unknown(),
  after: z.unknown(),
});

export const contentVersionRecord = z.object({
  _id: z.string(),
  contentType: z.string(),
  documentId: z.string(),
  revision: z.number(),
  operation: z.enum(["create", "update", "delete", "restore"]),
  actorId: z.string().optional(),
  actorLabel: z.string().optional(),
  actorAvatar: z
    .object({
      _id: z.string(),
      name: z.string().optional(),
      key: z.string().optional(),
      access: z.enum(["public", "private"]).optional(),
      mime: z.string().optional(),
      url: z.url().optional(),
      previewKey: z.string().optional(),
      previewUrl: z.url().optional(),
    })
    .optional(),
  reason: z.string().optional(),
  changedAt: dateLike,
  schemaVersion: z.number().optional(),
  diff: z.array(versionDiffEntry),
  snapshot: z.record(z.string(), z.unknown()).nullable(),
});

export const listVersionsInput = z.object({
  contentType: z.string(),
  documentId: z.string(),
});

export const getVersionInput = z.object({
  versionId: z.string(),
});

export const restoreVersionInput = z.object({
  versionId: z.string(),
  reason: z.string().optional(),
});

export const restoreVersionOutput = z.object({
  version: contentVersionRecord,
  restored: z.record(z.string(), z.unknown()),
});

export const listVersionsOutput = z.array(contentVersionRecord);

export type ContentVersionRecord = z.infer<typeof contentVersionRecord>;
export type ListVersionsInput = z.infer<typeof listVersionsInput>;
export type GetVersionInput = z.infer<typeof getVersionInput>;
export type RestoreVersionInput = z.infer<typeof restoreVersionInput>;
export type RestoreVersionOutput = z.infer<typeof restoreVersionOutput>;
export type ListVersionsOutput = z.infer<typeof listVersionsOutput>;
