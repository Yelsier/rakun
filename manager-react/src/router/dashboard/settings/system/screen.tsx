"use client";

import { DatabaseBackup, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { useManagerMutation, useManagerQuery } from "@/client/react";
import Loading from "@/components/loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type BackupRecord = {
  _id: string;
  reason?: string;
  contentTypes: string[];
  createdAt: string | Date;
  documentCount: number;
  status: "completed" | "failed";
};

type MigrationRecord = {
  _id: string;
  contentType: string;
  migrationId: string;
  from: number;
  to: number;
  status: "running" | "completed" | "failed";
  startedAt: string | Date;
  error?: string;
};

type MigrationState = {
  _id: string;
  contentType: string;
  version: number;
  updatedAt: string | Date;
};

type PendingMigration = {
  contentType: string;
  migrationId: string;
  from: number;
  to: number;
};

const formatDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const ManagerSettingsSystemScreen = () => {
  const backupsQuery = useManagerQuery({
    name: "manager.backups.list",
    input: undefined as never,
  });
  const migrationsQuery = useManagerQuery({
    name: "manager.migrations.list",
    input: undefined as never,
  });
  const createBackupMutation = useManagerMutation("manager.backups.create");
  const restoreBackupMutation = useManagerMutation("manager.backups.restore");

  const createBackup = async () => {
    await createBackupMutation.mutateAsync({
      reason: "manual backup",
    });
    toast.success("Backup created successfully");
    await backupsQuery.refetch();
  };

  const restoreBackup = async (backupId: string) => {
    if (
      !window.confirm(
        "Restore this backup? A safety backup will be created first.",
      )
    ) {
      return;
    }

    await restoreBackupMutation.mutateAsync({
      backupId,
      reason: "manual restore",
    });
    toast.success("Backup restored successfully");
    await backupsQuery.refetch();
  };

  const backups = (backupsQuery.data ?? []) as BackupRecord[];
  const migrations = (migrationsQuery.data?.migrations ??
    []) as MigrationRecord[];
  const states = (migrationsQuery.data?.states ?? []) as MigrationState[];
  const pending = (migrationsQuery.data?.pending ?? []) as PendingMigration[];

  if (backupsQuery.isLoading || migrationsQuery.isLoading) {
    return <Loading />;
  }

  return (
    <div className="container mx-auto flex flex-col gap-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">System</h1>
        </div>
        <Button
          loading={createBackupMutation.isPending}
          onClick={() => void createBackup()}
        >
          <DatabaseBackup />
          Create backup
        </Button>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Backups</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {backups.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No backups yet.
              </div>
            ) : (
              backups.map((backup) => (
                <div
                  key={backup._id}
                  className="flex items-center justify-between gap-4 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {backup.reason ?? backup._id}
                      </span>
                      <Badge
                        variant={
                          backup.status === "completed"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {backup.status}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {formatDateTime(backup.createdAt)} ·{" "}
                      {backup.documentCount} docs · {backup.contentTypes.join(", ")}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={restoreBackupMutation.isPending}
                    disabled={backup.status !== "completed"}
                    onClick={() => void restoreBackup(backup._id)}
                  >
                    <RotateCcw />
                    Restore
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Schema State</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {pending.length > 0 ? (
              <div className="rounded-md border border-amber-300 p-3 text-sm">
                {pending.length} pending migration
                {pending.length === 1 ? "" : "s"}
              </div>
            ) : null}
            {states.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                No schema state recorded.
              </div>
            ) : (
              states.map((state) => (
                <div
                  key={state._id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <span className="font-medium">{state.contentType}</span>
                  <Badge variant="outline">v{state.version}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Migration Ledger</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {migrations.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              No migrations executed yet.
            </div>
          ) : (
            migrations.map((migration) => (
              <div
                key={migration._id}
                className="grid gap-2 rounded-md border p-3 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{migration.migrationId}</span>
                    <Badge
                      variant={
                        migration.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {migration.status}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {migration.contentType} · v{migration.from} to v
                    {migration.to} ·{" "}
                    {formatDateTime(migration.startedAt)}
                  </div>
                  {migration.error ? (
                    <div className="text-destructive mt-2 text-xs">
                      {migration.error}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
