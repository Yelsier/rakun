import type { Db, Document } from "mongodb";

import { ContentVersion, ManagerUser } from "../internal-content-types";
import type ContentType from "../lib/ContentType";
import { Logger } from "../lib/Logger";
import { getContentTypeByName } from "../lib/Registry";
import { getMongoDB } from "./mongodbPeer";
import { parseId } from "./utils/parseId";
import { transformObjectIdsToStrings } from "./utils/transformObjectIdsToStrings";
import { transformStringToObjectIds } from "./utils/transformStringToObjectIds";

export type VersionOperation = "create" | "update" | "delete" | "restore";

export type VersionDiffEntry = {
  path: string;
  before: unknown;
  after: unknown;
};

export type ContentVersionRecord = {
  _id: string;
  contentType: string;
  documentId: string;
  revision: number;
  operation: VersionOperation;
  actorId?: string;
  actorLabel?: string;
  actorAvatar?: {
    _id: string;
    name?: string;
    key?: string;
    access?: "public" | "private";
    mime?: string;
    url?: string;
    previewKey?: string;
    previewUrl?: string;
  };
  reason?: string;
  changedAt: Date;
  schemaVersion?: number;
  diff: VersionDiffEntry[];
  snapshot: Record<string, unknown> | null;
};

export type VersionListInput = {
  contentType: string;
  documentId: string;
};

export type VersionRestoreInput = {
  versionId: string;
  actorId?: string;
  reason?: string;
};

export type VersionRestoreOutput = {
  version: ContentVersionRecord;
  restored: Record<string, unknown>;
};

export interface VersionAdapter {
  list(input: VersionListInput): Promise<ContentVersionRecord[]>;
  get(versionId: string): Promise<ContentVersionRecord | null>;
  restore(input: VersionRestoreInput): Promise<VersionRestoreOutput>;
}

export type VersionRecordOptions = {
  actorId?: string;
  reason?: string;
  operation: VersionOperation;
  before: Document | null;
  after: Document | null;
  revision?: number;
};

type VersionedContentType = Pick<
  ContentType,
  "name" | "schemaVersion" | "versioning"
>;

const VERSIONS = ContentVersion.name;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  !(value instanceof Date);

const valuesEqual = (left: unknown, right: unknown): boolean => {
  if (left instanceof Date || right instanceof Date) {
    return (
      left instanceof Date &&
      right instanceof Date &&
      left.getTime() === right.getTime()
    );
  }

  return JSON.stringify(left) === JSON.stringify(right);
};

const diffValues = (
  before: unknown,
  after: unknown,
  path = "",
): VersionDiffEntry[] => {
  if (valuesEqual(before, after)) return [];

  if (isRecord(before) && isRecord(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    return Array.from(keys).flatMap((key) =>
      diffValues(
        before[key],
        after[key],
        path ? `${path}.${key}` : key,
      ),
    );
  }

  return [
    {
      path: path || "$",
      before,
      after,
    },
  ];
};

const toSnapshot = (value: Document | null): Record<string, unknown> | null =>
  value ? (transformObjectIdsToStrings(value) as Record<string, unknown>) : null;

const toContentVersionRecord = (
  value: Document | null,
): ContentVersionRecord | null => {
  if (!value) return null;

  const record = transformObjectIdsToStrings(value) as Record<string, unknown>;

  if (record.actorId === null) delete record.actorId;
  if (record.reason === null) delete record.reason;
  if (record.schemaVersion === null) delete record.schemaVersion;

  return record as unknown as ContentVersionRecord;
};

type ActorInfo = {
  label: string;
  avatar?: ContentVersionRecord["actorAvatar"];
};

const loadActorInfo = async (
  db: Db,
  actorIds: readonly (string | undefined)[],
) => {
  const { ObjectId } = getMongoDB();
  const ids = Array.from(
    new Set(actorIds.filter((actorId): actorId is string => !!actorId)),
  ).filter((actorId) => ObjectId.isValid(actorId));

  if (ids.length === 0) {
    return new Map<string, ActorInfo>();
  }

  const users = await db
    .collection(ManagerUser.name)
    .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } })
    .project({
      user: 1,
      email: 1,
      avatarId: 1,
      avatarKey: 1,
      avatarAccess: 1,
      avatarUrl: 1,
      avatarPreviewUrl: 1,
    })
    .toArray();

  return new Map(
    users.map((user) => {
      const id = String(user._id);
      const avatarId =
        typeof user.avatarId === "string" ? user.avatarId : undefined;
      const label =
        typeof user.user === "string" && user.user.length > 0
          ? user.user
          : typeof user.email === "string" && user.email.length > 0
            ? user.email
            : id;

      return [
        id,
        {
          label,
          avatar: avatarId
            ? {
                _id: avatarId,
                key:
                  typeof user.avatarKey === "string"
                    ? user.avatarKey
                    : undefined,
                access:
                  user.avatarAccess === "public" ||
                  user.avatarAccess === "private"
                    ? user.avatarAccess
                    : undefined,
                url:
                  typeof user.avatarUrl === "string"
                    ? user.avatarUrl
                    : undefined,
                previewUrl:
                  typeof user.avatarPreviewUrl === "string"
                    ? user.avatarPreviewUrl
                    : undefined,
              }
            : undefined,
        },
      ] as const;
    }),
  );
};

const enrichVersionRecords = async (
  db: Db,
  records: ContentVersionRecord[],
) => {
  const actorInfo = await loadActorInfo(
    db,
    records.map((record) => record.actorId),
  );

  return records.map((record) => {
    const actor = record.actorId
      ? actorInfo.get(record.actorId)
      : undefined;

    return actor
      ? { ...record, actorLabel: actor.label, actorAvatar: actor.avatar }
      : record;
  });
};

const enrichVersionRecord = async (
  db: Db,
  record: ContentVersionRecord | null,
) => (record ? (await enrichVersionRecords(db, [record]))[0] : null);

const getDocumentId = (before: Document | null, after: Document | null) => {
  const id = after?._id ?? before?._id;

  if (!id) {
    throw new Error("Cannot create a version without a document id");
  }

  return String(id);
};

const getMaxVersions = (contentType: VersionedContentType) =>
  typeof contentType.versioning === "object"
    ? contentType.versioning.maxVersions
    : undefined;

const pruneVersions = async (
  db: Db,
  contentType: VersionedContentType,
  documentId: string,
) => {
  const maxVersions = getMaxVersions(contentType);

  if (!maxVersions || maxVersions < 1) return;

  Logger.addTrace("versions.prune: start", {
    contentType: contentType.name,
    documentId,
    maxVersions,
  });

  const oldVersions = await db
    .collection(VERSIONS)
    .find({ contentType: contentType.name, documentId })
    .sort({ revision: -1 })
    .skip(maxVersions)
    .project({ _id: 1 })
    .toArray();

  if (oldVersions.length === 0) {
    Logger.addTrace("versions.prune: nothing to prune", {
      contentType: contentType.name,
      documentId,
      maxVersions,
    });
    return;
  }

  await db.collection(VERSIONS).deleteMany({
    _id: { $in: oldVersions.map((version) => version._id) },
  });
  Logger.addTrace("versions.prune: deleted old versions", {
    contentType: contentType.name,
    documentId,
    deleted: oldVersions.length,
  });
};

export const recordContentVersion = async (
  db: Db,
  contentType: VersionedContentType,
  options: VersionRecordOptions,
): Promise<ContentVersionRecord> => {
  const before = toSnapshot(options.before);
  const after = toSnapshot(options.after);
  const snapshot = options.operation === "delete" ? before : after;
  const documentId = getDocumentId(options.before, options.after);
  const revision =
    options.revision ??
    Number(after?._revision ?? Number(before?._revision ?? 0) + 1);
  const diff = diffValues(before, after);

  Logger.addTrace("versions.record: start", {
    contentType: contentType.name,
    documentId,
    revision,
    operation: options.operation,
    actorId: options.actorId,
    hasReason: !!options.reason,
    schemaVersion: contentType.schemaVersion,
    diffEntries: diff.length,
    hasSnapshot: !!snapshot,
  });

  const insert = await db.collection(VERSIONS).insertOne({
    contentType: contentType.name,
    documentId,
    revision,
    operation: options.operation,
    ...(options.actorId !== undefined ? { actorId: options.actorId } : {}),
    ...(options.reason !== undefined ? { reason: options.reason } : {}),
    changedAt: new Date(),
    ...(typeof contentType.schemaVersion === "number"
      ? { schemaVersion: contentType.schemaVersion }
      : {}),
    diff,
    snapshot,
  });
  Logger.addTrace("versions.record: inserted", {
    versionId: insert.insertedId.toString(),
    contentType: contentType.name,
    documentId,
    revision,
  });

  await pruneVersions(db, contentType, documentId);

  const version = await db
    .collection(VERSIONS)
    .findOne({ _id: insert.insertedId });

  if (!version) {
    Logger.addTrace("versions.record: inserted version reload failed", {
      versionId: insert.insertedId.toString(),
      contentType: contentType.name,
      documentId,
    });
  }

  const record = toContentVersionRecord(version);

  if (!record) {
    throw new Error("Content version was created but could not be loaded");
  }

  return (await enrichVersionRecord(db, record)) ?? record;
};

export const createMongoVersionAdapter = (db: Db): VersionAdapter => {
  const list = async (
    input: VersionListInput,
  ): Promise<ContentVersionRecord[]> => {
    Logger.addTrace("versions.list: start", {
      contentType: input.contentType,
      documentId: input.documentId,
    });

    const versions = (
      await db
        .collection(VERSIONS)
        .find({
          contentType: input.contentType,
          documentId: input.documentId,
        })
        .sort({ revision: -1 })
        .toArray()
    )
      .map(toContentVersionRecord)
      .filter((version): version is ContentVersionRecord => !!version);
    const enrichedVersions = await enrichVersionRecords(db, versions);
    Logger.addTrace("versions.list: loaded", {
      contentType: input.contentType,
      documentId: input.documentId,
      versions: enrichedVersions.length,
    });
    return enrichedVersions;
  };

  const get = async (versionId: string): Promise<ContentVersionRecord | null> => {
    Logger.addTrace("versions.get: start", { versionId });
    const version = await enrichVersionRecord(
      db,
      toContentVersionRecord(
        await db.collection(VERSIONS).findOne({ _id: parseId(versionId) }),
      ),
    );
    Logger.addTrace("versions.get: loaded", {
      versionId,
      found: !!version,
      contentType: version?.contentType,
      documentId: version?.documentId,
      revision: version?.revision,
    });
    return version;
  };

  const restore = async (
    input: VersionRestoreInput,
  ): Promise<VersionRestoreOutput> => {
    Logger.addTrace("versions.restore: start", {
      versionId: input.versionId,
      actorId: input.actorId,
      hasReason: !!input.reason,
    });

    const version = await get(input.versionId);

    if (!version) {
      Logger.addTrace("versions.restore: version not found", {
        versionId: input.versionId,
      });
      throw new Error(`Version not found: ${input.versionId}`);
    }

    if (!version.snapshot) {
      Logger.addTrace("versions.restore: snapshot missing", {
        versionId: input.versionId,
        contentType: version.contentType,
        documentId: version.documentId,
        revision: version.revision,
      });
      throw new Error(`Version has no restorable snapshot: ${input.versionId}`);
    }

    const contentType = getContentTypeByName(version.contentType) ?? {
      name: version.contentType,
      schemaVersion: version.schemaVersion,
      versioning: true,
    };
    const collection = db.collection(version.contentType);
    const id = parseId(version.documentId);
    const before = await collection.findOne({ _id: id });
    const nextRevision = Number(before?._revision ?? version.revision) + 1;
    Logger.addTrace("versions.restore: source loaded", {
      versionId: input.versionId,
      contentType: version.contentType,
      documentId: version.documentId,
      revision: version.revision,
      currentExists: !!before,
      nextRevision,
    });

    const restored = {
      ...version.snapshot,
      _id: version.documentId,
      _revision: nextRevision,
      _schemaVersion: contentType.schemaVersion ?? version.schemaVersion,
      updatedAt: new Date(),
      ...(input.actorId ? { updatedBy: input.actorId } : {}),
    };

    const result = await collection.findOneAndReplace(
      { _id: id },
      transformStringToObjectIds(restored),
      { upsert: true, returnDocument: "after" },
    );

    const restoredDocument = result ?? (await collection.findOne({ _id: id }));

    if (!restoredDocument) {
      Logger.addTrace("versions.restore: restored document reload failed", {
        versionId: input.versionId,
        contentType: version.contentType,
        documentId: version.documentId,
      });
      throw new Error(`Failed to restore version: ${input.versionId}`);
    }

    await recordContentVersion(db, contentType, {
      operation: "restore",
      actorId: input.actorId,
      reason: input.reason,
      before,
      after: restoredDocument,
      revision: nextRevision,
    });
    Logger.addTrace("versions.restore: completed", {
      versionId: input.versionId,
      contentType: version.contentType,
      documentId: version.documentId,
      revision: nextRevision,
    });

    return {
      version,
      restored: transformObjectIdsToStrings(restoredDocument) as Record<
        string,
        unknown
      >,
    };
  };

  return { list, get, restore };
};
