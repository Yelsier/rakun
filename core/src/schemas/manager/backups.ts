import z from "zod";

const dateLike = z.union([z.date(), z.string()]);

export const backupRecord = z.object({
  _id: z.string(),
  reason: z.string().optional(),
  contentTypes: z.array(z.string()),
  createdAt: dateLike,
  createdBy: z.string().optional(),
  documentCount: z.number(),
  status: z.enum(["completed", "failed"]),
  error: z.string().optional(),
});

export const createBackupInput = z.object({
  contentTypes: z.array(z.string()).optional(),
  reason: z.string().optional(),
});

export const restoreBackupInput = z.object({
  backupId: z.string(),
  reason: z.string().optional(),
});

export const restoreBackupOutput = z.object({
  backup: backupRecord,
  safetyBackup: backupRecord,
  restoredCount: z.number(),
});

export const listBackupsOutput = z.array(backupRecord);

export type BackupRecord = z.infer<typeof backupRecord>;
export type CreateBackupInput = z.infer<typeof createBackupInput>;
export type RestoreBackupInput = z.infer<typeof restoreBackupInput>;
export type RestoreBackupOutput = z.infer<typeof restoreBackupOutput>;
export type ListBackupsOutput = z.infer<typeof listBackupsOutput>;

