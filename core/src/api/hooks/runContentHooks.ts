import type ContentType from "../../lib/ContentType";
import type {
  DataFront,
  DataInput,
  DataPopulatedWithoutApiOnly,
  DBOutput,
  Filter,
} from "../../lib/types";
import type {
  ContentHookContext,
  ContentHookOperation,
  ContentHookSurface,
} from "../../lib/hooks";
import type { DBMutationOptions, DBService } from "../../orm/dbService";
import { getContentHookContext } from "./context";

type HookContextInput<T extends ContentType> = {
  db: DBService;
  contentType: T;
  operation: ContentHookOperation;
  surface?: ContentHookSurface;
  options?: DBMutationOptions;
};

export const hasContentHooks = (
  contentType: ContentType,
  names: Array<keyof NonNullable<ContentType["hooks"]>>,
) => names.some((name) => !!contentType.hooks?.[name]);

export const createContentHookContext = <T extends ContentType>({
  db,
  contentType,
  operation,
  surface,
  options,
}: HookContextInput<T>): ContentHookContext<T> => {
  const stored = getContentHookContext();

  return {
    db,
    rawDB: db.rawDB,
    contentType,
    operation,
    surface: surface ?? stored.surface ?? "db",
    actorId: options?.actorId,
    reason: options?.reason,
    requestContext: stored.requestContext,
    locale: stored.locale,
    route: stored.route,
  };
};

export const runBeforeInsertHook = async <T extends ContentType>({
  db,
  contentType,
  data,
  options,
}: {
  db: DBService;
  contentType: T;
  data: DataInput<T>;
  options?: DBMutationOptions;
}): Promise<DataInput<T>> => {
  const hook = contentType.hooks?.beforeInsert;
  if (!hook) return data;

  const next = await hook({
    data,
    context: createContentHookContext({
      db,
      contentType,
      operation: "insert",
      options,
    }),
  } as never);

  return (next ?? data) as DataInput<T>;
};

export const runAfterInsertHook = async <T extends ContentType>({
  db,
  contentType,
  document,
  input,
  options,
}: {
  db: DBService;
  contentType: T;
  document: DBOutput<T>;
  input: DataInput<T>;
  options?: DBMutationOptions;
}) => {
  const hook = contentType.hooks?.afterInsert;
  if (!hook) return;

  await hook({
    document,
    input,
    context: createContentHookContext({
      db,
      contentType,
      operation: "insert",
      options,
    }),
  } as never);
};

export const runBeforeUpdateHook = async <T extends ContentType>({
  db,
  contentType,
  id,
  data,
  current,
  options,
}: {
  db: DBService;
  contentType: T;
  id: string;
  data: Partial<DataInput<T>> | DataInput<T>;
  current?: DBOutput<T>;
  options?: DBMutationOptions;
}): Promise<Partial<DataInput<T>> | DataInput<T>> => {
  const hook = contentType.hooks?.beforeUpdate;
  if (!hook) return data;

  const next = await hook({
    id,
    data,
    current,
    context: createContentHookContext({
      db,
      contentType,
      operation: "update",
      options,
    }),
  } as never);

  return (next ?? data) as Partial<DataInput<T>> | DataInput<T>;
};

export const runAfterUpdateHook = async <T extends ContentType>({
  db,
  contentType,
  id,
  document,
  previous,
  input,
  options,
}: {
  db: DBService;
  contentType: T;
  id: string;
  document: DBOutput<T>;
  previous?: DBOutput<T> | null;
  input: Partial<DataInput<T>> | DataInput<T>;
  options?: DBMutationOptions;
}) => {
  const hook = contentType.hooks?.afterUpdate;
  if (!hook) return;

  await hook({
    id,
    document,
    previous,
    input,
    context: createContentHookContext({
      db,
      contentType,
      operation: "update",
      options,
    }),
  } as never);
};

export const runBeforeUpdateManyHook = async <T extends ContentType>({
  db,
  contentType,
  filter,
  data,
  options,
}: {
  db: DBService;
  contentType: T;
  filter: Filter<T>;
  data: Partial<DataInput<T>>;
  options?: DBMutationOptions;
}): Promise<Partial<DataInput<T>>> => {
  const hook = contentType.hooks?.beforeUpdateMany;
  if (!hook) return data;

  const next = await hook({
    filter,
    data,
    context: createContentHookContext({
      db,
      contentType,
      operation: "updateMany",
      options,
    }),
  } as never);

  return (next ?? data) as Partial<DataInput<T>>;
};

export const runAfterUpdateManyHook = async <T extends ContentType>({
  db,
  contentType,
  filter,
  data,
  updatedCount,
  options,
}: {
  db: DBService;
  contentType: T;
  filter: Filter<T>;
  data: Partial<DataInput<T>>;
  updatedCount: number;
  options?: DBMutationOptions;
}) => {
  const hook = contentType.hooks?.afterUpdateMany;
  if (!hook) return;

  await hook({
    filter,
    data,
    updatedCount,
    context: createContentHookContext({
      db,
      contentType,
      operation: "updateMany",
      options,
    }),
  } as never);
};

export const runBeforeDeleteHook = async <T extends ContentType>({
  db,
  contentType,
  filter,
  documents,
  options,
}: {
  db: DBService;
  contentType: T;
  filter: Filter<T>;
  documents: DBOutput<T>[];
  options?: DBMutationOptions;
}) => {
  const hook = contentType.hooks?.beforeDelete;
  if (!hook) return;

  await hook({
    filter,
    documents,
    context: createContentHookContext({
      db,
      contentType,
      operation: "delete",
      options,
    }),
  } as never);
};

export const runAfterDeleteHook = async <T extends ContentType>({
  db,
  contentType,
  filter,
  documents,
  options,
}: {
  db: DBService;
  contentType: T;
  filter: Filter<T>;
  documents: DBOutput<T>[];
  options?: DBMutationOptions;
}) => {
  const hook = contentType.hooks?.afterDelete;
  if (!hook) return;

  await hook({
    filter,
    documents,
    context: createContentHookContext({
      db,
      contentType,
      operation: "delete",
      options,
    }),
  } as never);
};

export const runOnGetHook = async <T extends ContentType>({
  db,
  contentType,
  data,
  surface,
}: {
  db: DBService;
  contentType: T;
  data: DataPopulatedWithoutApiOnly<T>;
  surface: ContentHookSurface;
}): Promise<DataFront<T> | DataPopulatedWithoutApiOnly<T>> => {
  const hook = contentType.hooks?.onGet;
  if (!hook) return data;

  const next = await hook({
    data,
    context: createContentHookContext({
      db,
      contentType,
      operation: "get",
      surface,
    }),
  } as never);

  return (next ?? data) as DataFront<T> | DataPopulatedWithoutApiOnly<T>;
};
