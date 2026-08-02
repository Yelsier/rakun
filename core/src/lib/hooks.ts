import type ContentType from "./ContentType";
import type { RakunRequestContext } from "../api/context";
import type { DBMutationOptions, DBService } from "../orm/dbService";
import type { BreadcrumsValue } from './fields/Breadcrums'

export type Awaitable<T> = T | Promise<T>;

export type ContentHookOperation =
  | "insert"
  | "update"
  | "updateMany"
  | "delete"
  | "get";

export type ContentHookSurface = "db" | "web" | "preview";

export type ContentHookDocument = Record<string, unknown>;

export type ContentHookRouteContext = {
  path?: string;
  routeId?: string;
  contentTypeId?: string;
  type?: string;
  info?: Record<string, unknown>;
  breadcrums?: BreadcrumsValue;
};

export type ContentHookContext<T extends ContentType = ContentType> = {
  db: DBService;
  rawDB: unknown;
  contentType: T;
  operation: ContentHookOperation;
  surface: ContentHookSurface;
  actorId?: string;
  reason?: string;
  requestContext?: RakunRequestContext;
  locale?: string;
  route?: ContentHookRouteContext;
};

type MutationContextInput<T extends ContentType> = {
  context: ContentHookContext<T>;
};

export type ContentTypeHooks = {
  beforeInsert?: (args: {
    data: ContentHookDocument;
    context: ContentHookContext;
  }) => Awaitable<ContentHookDocument | void>;
  afterInsert?: (args: {
    document: ContentHookDocument;
    input: ContentHookDocument;
    context: ContentHookContext;
  }) => Awaitable<void>;
  beforeUpdate?: (args: {
    id: string;
    data: Partial<ContentHookDocument> | ContentHookDocument;
    current?: ContentHookDocument;
    context: ContentHookContext;
  }) => Awaitable<Partial<ContentHookDocument> | ContentHookDocument | void>;
  afterUpdate?: (args: {
    id: string;
    document: ContentHookDocument;
    previous?: ContentHookDocument | null;
    input: Partial<ContentHookDocument> | ContentHookDocument;
    context: ContentHookContext;
  }) => Awaitable<void>;
  beforeUpdateMany?: (args: {
    filter: ContentHookDocument;
    data: Partial<ContentHookDocument>;
    context: ContentHookContext;
  }) => Awaitable<Partial<ContentHookDocument> | void>;
  afterUpdateMany?: (args: {
    filter: ContentHookDocument;
    data: Partial<ContentHookDocument>;
    updatedCount: number;
    context: ContentHookContext;
  }) => Awaitable<void>;
  beforeDelete?: (args: {
    filter: ContentHookDocument;
    documents: ContentHookDocument[];
    context: ContentHookContext;
  }) => Awaitable<void>;
  afterDelete?: (args: {
    filter: ContentHookDocument;
    documents: ContentHookDocument[];
    context: ContentHookContext;
  }) => Awaitable<void>;
  onGet?: (args: {
    data: ContentHookDocument;
    context: ContentHookContext;
  }) => Awaitable<ContentHookDocument | void>;
};

export type ContentHookContextStorage = {
  requestContext?: RakunRequestContext;
  locale?: string;
  route?: ContentHookRouteContext;
  surface?: ContentHookSurface;
};

export type ContentHookContextArgs<T extends ContentType> =
  MutationContextInput<T> & {
    options?: DBMutationOptions;
  };
