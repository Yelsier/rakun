"use client";

import { AlertTriangle, DatabaseBackup, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useManagerMutation, useManagerQuery } from "@/client/react";
import Loading from "@/components/loading";
import UnauthorizedMessage from "@/components/unauthorized";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "@/state/session";

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
  const { hasPermissions, hasAnyPermission } = useSession();
  const [restoreTarget, setRestoreTarget] = useState<BackupRecord | null>(null);
  const canReadBackups = hasPermissions(["manager.backups.readAny"]);
  const canUpdateBackups = hasPermissions(["manager.backups.updateAny"]);
  const canReadMigrations = hasPermissions(["manager.migrations.readAny"]);
  const canReadSystem = hasAnyPermission([
    "manager.backups.readAny",
    "manager.migrations.readAny",
  ]);
  const backupsQuery = useManagerQuery({
    name: "manager.backups.list",
    input: undefined as never,
    enabled: canReadBackups,
  });
  const migrationsQuery = useManagerQuery({
    name: "manager.migrations.list",
    input: undefined as never,
    enabled: canReadMigrations,
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

  const restoreBackup = async () => {
    if (!restoreTarget) return;

    await restoreBackupMutation.mutateAsync({
      backupId: restoreTarget._id,
      reason: "manual restore",
    });
    toast.success("Backup restored successfully");
    setRestoreTarget(null);
    await backupsQuery.refetch();
  };

  if (!canReadSystem) {
    return (
      <UnauthorizedMessage
        anyPermission
        neededPermission={[
          "manager.backups.readAny",
          "manager.migrations.readAny",
        ]}
      />
    );
  }

  const backups = (backupsQuery.data ?? []) as BackupRecord[];
  const migrations = (migrationsQuery.data?.migrations ??
    []) as MigrationRecord[];
  const states = (migrationsQuery.data?.states ?? []) as MigrationState[];
  const pending = (migrationsQuery.data?.pending ?? []) as PendingMigration[];

  if (
    (canReadBackups && backupsQuery.isLoading) ||
    (canReadMigrations && migrationsQuery.isLoading)
  ) {
    return <Loading />;
  }

  return (
    <div className="container mx-auto flex flex-col gap-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">System</h1>
        </div>
        {canUpdateBackups ? (
          <Button
            loading={createBackupMutation.isPending}
            onClick={() => void createBackup()}
          >
            <DatabaseBackup />
            Create backup
          </Button>
        ) : null}
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {canReadBackups ? (
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
                        {backup.documentCount} docs ·{" "}
                        {backup.contentTypes.join(", ")}
                      </div>
                    </div>
                    {canUpdateBackups ? (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={restoreBackupMutation.isPending}
                        disabled={backup.status !== "completed"}
                        onClick={() => setRestoreTarget(backup)}
                      >
                        <RotateCcw />
                        Restore
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ) : null}

        {canReadMigrations ? (
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
        ) : null}
      </section>

      {canReadMigrations ? (
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
                      <span className="font-medium">
                        {migration.migrationId}
                      </span>
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
                      {migration.to} · {formatDateTime(migration.startedAt)}
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
      ) : null}

      <Dialog
        open={restoreTarget !== null}
        onOpenChange={(open) => {
          if (!open && !restoreBackupMutation.isPending) {
            setRestoreTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="flex gap-3">
              <div className="bg-destructive/10 text-destructive flex size-10 shrink-0 items-center justify-center rounded-md">
                <AlertTriangle className="size-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle>Restore backup</DialogTitle>
                <DialogDescription className="mt-2">
                  This will replace the current database documents for the
                  backed up content types. A safety backup will be created
                  before restoring.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {restoreTarget ? (
            <div className="space-y-3">
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium">
                  {restoreTarget.reason ?? restoreTarget._id}
                </div>
                <div className="text-muted-foreground mt-1 text-xs">
                  {formatDateTime(restoreTarget.createdAt)} ·{" "}
                  {restoreTarget.documentCount} docs ·{" "}
                  {restoreTarget.contentTypes.join(", ")}
                </div>
              </div>

              <div className="rounded-md border border-amber-300 bg-amber-500/10 p-3 text-sm">
                <div className="font-medium">Files are not restored</div>
                <div className="text-muted-foreground mt-1">
                  Backups only store database documents. Images and other
                  uploaded files are not included, so deleted or changed assets
                  will not be recovered by this restore.
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={restoreBackupMutation.isPending}
              onClick={() => setRestoreTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={restoreBackupMutation.isPending}
              onClick={() => void restoreBackup()}
            >
              Restore backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
