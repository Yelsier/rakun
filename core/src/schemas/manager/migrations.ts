import z from "zod";

const dateLike = z.union([z.date(), z.string()]);

export const migrationStateRecord = z.object({
  _id: z.string(),
  contentType: z.string(),
  version: z.number(),
  updatedAt: dateLike,
});

export const migrationLedgerRecord = z.object({
  _id: z.string(),
  contentType: z.string(),
  migrationId: z.string(),
  from: z.number(),
  to: z.number(),
  description: z.string().optional(),
  status: z.enum(["running", "completed", "failed"]),
  backupId: z.string().optional(),
  startedAt: dateLike,
  completedAt: dateLike.optional(),
  failedAt: dateLike.optional(),
  error: z.string().optional(),
});

export const pendingMigrationRecord = z.object({
  contentType: z.string(),
  migrationId: z.string(),
  from: z.number(),
  to: z.number(),
  description: z.string().optional(),
});

export const listMigrationsOutput = z.object({
  states: z.array(migrationStateRecord),
  migrations: z.array(migrationLedgerRecord),
  pending: z.array(pendingMigrationRecord),
});

export type MigrationStateRecord = z.infer<typeof migrationStateRecord>;
export type MigrationLedgerRecord = z.infer<typeof migrationLedgerRecord>;
export type PendingMigrationRecord = z.infer<typeof pendingMigrationRecord>;
export type ListMigrationsOutput = z.infer<typeof listMigrationsOutput>;

