import type {
  DataInput,
  DBOutput,
  FieldsQuery,
  Filter,
  GetAllInput,
  Query,
} from "../lib/types";
import ContentType from "../lib/ContentType";
import { Id } from "../lib/utils/id";
import type { BackupAdapter } from "./backups";
import type { MigrationAdapter } from "./migrations";
import type { VersionAdapter } from "./versions";

type DbErrorTag =
  | "DbError"
  | "DbErrorUnknown"
  | "DbErrorNotFound"
  | "DbErrorInvalidData"
  | "DbErrorSimulatedFailure"
  | "DbErrorConflict";

export class DbError extends Error {
  _tag: DbErrorTag = "DbError";
  status: number;
  constructor(
    public override readonly message: string,
    public readonly details?: unknown,
    status = 500,
  ) {
    super(message);
    this.name = "DbError";
    this.status = status;
  }
}

// Plain TypeScript error classes
export class DbErrorUnknown extends DbError {
  constructor(
    public override readonly message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this._tag = "DbErrorUnknown";
  }
}

export class DbErrorNotFound extends DbError {
  constructor(
    public override readonly message: string,
    public readonly details?: unknown,
  ) {
    super(message, details, 404);
    this._tag = "DbErrorNotFound";
  }
}

export class DbErrorInvalidData extends DbError {
  constructor(
    public override readonly message: string,
    public readonly issues?: unknown,
  ) {
    super(message, issues, 400);
    this._tag = "DbErrorInvalidData";
  }
}

export class DbErrorConflict extends DbError {
  constructor(
    public override readonly message: string,
    public readonly details?: unknown,
  ) {
    super(message, details, 409);
    this._tag = "DbErrorConflict";
  }
}

export class DbErrorSimulatedFailure extends DbError {
  constructor(
    public override readonly message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this._tag = "DbErrorSimulatedFailure";
  }
}

export type SimulatedFailureDatabaseCaseLiterals =
  | "ConnectionFailed"
  | "CreationError"
  | "UpdateError"
  | "DeletionError"
  | "FoundError";

// Simulated failure context for testing
let _simulatedFailureCase: SimulatedFailureDatabaseCaseLiterals | null = null;

export function setSimulatedFailureCase(
  failureCase: SimulatedFailureDatabaseCaseLiterals | null,
): void {
  _simulatedFailureCase = failureCase;
}

export function getSimulatedFailureCase(): SimulatedFailureDatabaseCaseLiterals | null {
  return _simulatedFailureCase;
}

export function checkFailureCase(
  failureCase: SimulatedFailureDatabaseCaseLiterals,
): void {
  const currentFailureCase = getSimulatedFailureCase();
  if (currentFailureCase === failureCase) {
    throw new DbErrorSimulatedFailure(`Simulated failure: ${failureCase}`);
  }
}

export interface DBService {
  rawDB: unknown;
  backups: BackupAdapter;
  migrations: MigrationAdapter;
  versions: VersionAdapter;
  get: <T extends ContentType>(
    contentType: T,
    id: Id,
    fields?: FieldsQuery<T>,
  ) => Promise<DBOutput<T>>;
  list: <T extends ContentType>(
    contentType: T,
    query: Query<T>,
  ) => Promise<{ totalItems: number; items: DBOutput<T>[] }>;
  create: <T extends ContentType>(
    contentType: T,
    data: DataInput<T>,
    options?: DBMutationOptions,
  ) => Promise<DBOutput<T>>;
  update: <T extends ContentType>(
    contentType: T,
    id: Id,
    data: Partial<DataInput<T>> | DataInput<T>,
    options?: DBMutationOptions,
  ) => Promise<DBOutput<T>>;
  updateMany: <T extends ContentType>(
    contentType: T,
    filter: Filter<T>,
    data: Partial<DataInput<T>>,
    options?: DBMutationOptions,
  ) => Promise<{ updatedCount: number }>;
  delete: <T extends ContentType>(
    contentType: T,
    filter: Filter<T>,
    options?: DBMutationOptions,
  ) => Promise<void>;
  find: <T extends ContentType>(
    contentType: T,
    filter: Filter<T>,
    fields?: FieldsQuery<T>,
  ) => Promise<DBOutput<T> | null>;
  clear: <T extends ContentType>(contentType: T) => Promise<void>;
  findDependencies: <T extends ContentType>(
    contentType: T,
    id: Id,
  ) => Promise<Array<{ contentType: string; _id: Id }>>;
  upsert: <T extends ContentType>(
    contentType: T,
    filter: Filter<T>,
    data: DataInput<T>,
    options?: DBMutationOptions,
  ) => Promise<DBOutput<T>>;
  getAll: <T extends ContentType>(
    contentType: T,
    query?: GetAllInput<T>,
  ) => Promise<DBOutput<T>[]>;
}

export type DBMutationOptions = {
  actorId?: string;
  reason?: string;
  skipVersioning?: boolean;
};
