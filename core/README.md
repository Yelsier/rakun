# @rakun-kit/core

`@rakun-kit/core` contains Rakun's shared domain model and runtime. It defines content types, fields, Zod schemas, manager/web operations, request context, MongoDB connection handling, media service, permissions, translations, and typed contracts used by adapters (`@rakun-kit/next`, `@rakun-kit/express`, `@rakun-kit/trpc`) and the manager client.

## Main Entry

Typical imports:

```ts
import {
  ContentType,
  Fields,
  rakunBootstrap,
  ensureRakunInitialized,
} from "@rakun-kit/core";
```

The main entrypoint exports:

- Bootstrap: `rakunBootstrap`, `ensureRakunBootstrap`, `ensureRakunInitialized`, `getRakunBootstrapOptions`.
- Context: `createRequestContext`, `getSessionCookie`, `setSessionCookie`.
- Operations: manager/web contracts and definitions.
- Media: `createMediaService`, `getMediaService`, adapters, and types.
- Permissions, translations, errors, contracts, and public types.
- Basic internal content types: `Language`, `ManagerUser`, `Seo`.

Relevant subpaths:

- `@rakun-kit/core/manager`: manager operation metadata and types.
- `@rakun-kit/core/contracts`: shared manager/web payload schemas.
- `@rakun-kit/core/client`: client-facing types and utilities.
- `@rakun-kit/core/logger`: logger.
- `@rakun-kit/core/errors`: application errors.
- `@rakun-kit/core/types`: types derived from content types.

## Bootstrap

`rakunBootstrap(options)` registers global configuration and content types:

```ts
rakunBootstrap({
  literals,
  contentTypes: [Page, Post],
  routes,
  proxies,
  apiOperations,
  mongo: {
    MONGO_URI: process.env.MONGO_URI!,
    ENVIRONMENT: process.env.NODE_ENV === "test" ? "test" : "production",
  },
  media,
  logger: {
    level: "info",
    prettify: true,
  },
  syncRoutes: true,
});
```

Options:

- `literals`: text/translation catalog.
- `contentTypes`: application content types.
- `internalContentTypes`: optional overrides for Rakun internal content types, currently `Page`.
- `routes`: configured routes used to resolve pages.
- `proxies`: API input/output extensions.
- `apiOperations`: custom API operations added to the Rakun operation registry.
- `mongo`: MongoDB connection. Required before serving Rakun requests.
- `media`: media adapter/configuration. Optional.
- `logger`: logger configuration. If omitted, an `info` logger with `prettify` is created.
- `syncRoutes`: syncs configured routes during initialization. Enabled by default.

Routes can define fixed layout module slots. Rakun syncs those slots and the
manager lets users select an existing entry for each route:

```ts
rakunBootstrap({
  // ...
  routes: [
    {
      key: "pages",
      contentType: "Page",
      field: "slug",
      iterator: "modules",
      hasPage: true,
      dynamic: false,
      defaultBasePath: "",
      layout: [
        { key: "header", contentType: "Header" },
        { type: "content" },
        { key: "footer", contentType: "Footer" },
      ],
    },
  ],
});
```

The web page response includes an ordered `layout` array containing module slots
plus the content slot.

`ensureRakunInitialized()` prepares logger, MongoDB, media, and route syncing. It uses a singleton promise to avoid concurrent initialization; if initialization fails, the promise is cleared so the next call can retry.

`ensureRakunBootstrap(options)` only calls `rakunBootstrap` if the runtime has not been bootstrapped yet.

## Content Types

A `ContentType` defines a logical collection:

```ts
const Post = new ContentType({
  name: "Post",
  menu: {
    title: "Posts",
    icon: "newspaper",
    category: "Content",
  },
  fields: {
    title: Fields.string().required(),
    slug: Fields.string().type("Slug").required(),
    body: Fields.string().type("RichText"),
    published: Fields.boolean(),
  },
  uniques: [["slug"]],
  listFields: ["title", "slug", "published"],
});
```

Main properties:

- `name`: stable type name. Also used as `_type`.
- `fields`: field map.
- `menu`: manager metadata.
- `uniques`: unique field groups.
- `listFields`: preferred fields in lists and relations.
- `hideFromManager()`: hides the content type from manager content type lists.
- `apiOnly()`: applies `.apiOnly()` to every field in the content type.
- `managerOnly()`: applies `.managerOnly()` to every field in the content type.

Schema and validation methods:

- `getInputSchema()`: write schema. Includes `_type`, `createdBy`, and `updatedBy`.
- `getSchema()`: persisted schema.
- `getPopulatedSchema()`: output with populated relations and `_id`.
- `getOutputSchema()`: public API output.
- `getOutputSchemaWithoutIterators()`: output variant without iterator fields.
- `validate`, `partialValidate`, `validateOutput`: Zod helpers.

The registry lives in `lib/Registry`:

- `registerContentType`, `registerInternalContentType`.
- `getContentTypes`, `getExternalContentTypes`, `getInternalContentTypes`.
- `getContentTypesForManager`: returns serializable content types without Zod schemas and without content types marked with `hideFromManager()`.
- `getContentTypeByName`.

## Fields

Main factory:

```ts
Fields.string();
Fields.number();
Fields.boolean();
Fields.date();
Fields.select(["draft", "published"]);
Fields.relation(Post);
Fields.contentReference("Post");
Fields.selfRelation();
Fields.blocks([{ name: "title", field: Fields.string() }]);
Fields.array(Fields.string());
Fields.iterator([...]);
Fields.link();
Fields.file();
```

Common modifiers:

- `.required()`: marks field as required.
- `.translatable()`: stores values per language with shape `{ _tag: "Translatable", ... }`.
- `.apiOnly()`: available for API/persistence, hidden from manager.
- `.managerOnly()`: visible to manager, excluded from API output.

Notable fields:

- `StringField`: UI `Text`, `Textarea`, `RichText`, `Email`, `Slug`, `Password`, `Id`, `Url`; supports `.min()` and `.max()`.
- `NumberField`: supports `.min()` and `.max()`.
- `RelationField`: relation to another `ContentType`; accepts existing references or inline creation. `Fields.relation(Post, "existing")` restricts to existing records; `"new"` restricts to new records. `.multiple()` returns a homogeneous array of relations.
- `ContentReferenceField`: reference by content type name.
- `FileField`: integrates media and optimization options.
- `Fields.blocks(...)`: heterogeneous ordered list. Each item stores a `name` and a `value`, and the value can match one of the named field shapes. Use it for block-like content where different item types can appear in the same list.
- `Fields.array(...)`: homogeneous ordered list. Every item uses the same field shape. Multi-value fields such as relation `.multiple()` use this backing model.
- `IteratorField`: repeatable structure based on content type entries.

## Derived Types

`@rakun-kit/core/types` and `lib/types` derive types from `ContentType`:

- `DataInput<T>`: accepted shape for create/update.
- `DBOutput<T>`: persisted shape with metadata (`_id`, `_type`, timestamps, authorship).
- `DataPopulated<T>`: shape with populated relations.
- `DataFront<T>`: public output without `apiOnly` fields.
- `Filter<T>`, `Query<T>`, `ListInput<T>`, `GetAllInput<T>`: typed filters and list inputs.
- `MaybeTranslatableValue<T>`, `TranslatableValue<T>`.

## ORM and Mongo

`core/src/orm` implements `DBService` on top of MongoDB:

```ts
const db = await getMongoService();

const post = await db.create(Post, {
  _type: "Post",
  title: "Hello",
  slug: "hello",
});
```

Operations:

- `get(contentType, id, fields?)`
- `list(contentType, query)`
- `create(contentType, data)`
- `update(contentType, id, data)`
- `updateMany(contentType, filter, data)`
- `delete(contentType, filter)`
- `find(contentType, filter, fields?)`
- `clear(contentType)`
- `findDependencies(contentType, id)`
- `upsert(contentType, filter, data)`
- `getAll(contentType, query?)`

Connection:

- `createMongoConnection(config)`: stores config.
- `createMongoService(config)`: connects and creates handlers.
- `getMongoService()`: returns the singleton or creates it from config.
- `closeMongoService()`: closes the connection and clears the singleton.

`MongoConfig`:

```ts
type MongoConfig = {
  MONGO_URI: string;
  ENVIRONMENT?: "local" | "development" | "test" | "production";
};
```

In environments other than `test`, the connection creates indexes defined by `createIndexes`.

## API Operations

`api/operations` defines typed contracts and handlers for endpoints:

- Manager: CRUD, auth, MFA, media, literals, settings.
- Web: page resolution.

Main helpers:

- `defineOperationContract`: declares a contract with Zod input/output, method, path, and metadata.
- `defineOperation`: combines a contract with its implementation.
- `createManagerOperationContracts`, `createWebOperationContracts`.
- `createManagerOperationDefinitions`, `createWebOperationDefinitions`.
- `createRakunOperationDefinitions`: combines manager + web.
- `createOperationManifest`: serializable metadata for clients.
- `createOperationPath`: HTTP path from operation name.
- `mergeOperationContracts`: combines maps.

`@rakun-kit/core/manager` exposes the manifest and name-based types:

```ts
import {
  managerOperationManifest,
  getManagerOperationMeta,
  type ManagerOperationInput,
  type ManagerOperationOutput,
} from "@rakun-kit/core/manager";
```

### Custom Operations

Applications can add operations through bootstrap:

```ts
import { defineOperation } from "@rakun-kit/core";
import { z } from "zod";

rakunBootstrap({
  // ...
  apiOperations: {
    "manager.reports.summary": defineOperation({
      access: "auth",
      kind: "query",
      method: "get",
      output: z.object({
        total: z.number(),
      }),
      resolve: async ({ ctx }) => {
        ctx.getUser();

        return { total: 0 };
      },
    }),
  },
});
```

Operation names define their HTTP path: `manager.reports.summary` becomes `/manager/reports/summary`.

Rules:

- Names must not collide with built-in operations.
- Operations prefixed with `manager.` are included in manager operation routers.
- Operations prefixed with `web.` are included in web operation routers.
- Operations with any other prefix are included when using the combined operation registry.

## Request Context and Auth

`createRequestContext(input)` normalizes headers, cookies, and response:

```ts
const ctx = await createRequestContext({
  headers: req.headers,
  cookies,
  res: {
    setHeader: res.setHeader.bind(res),
    cookie: res.cookie.bind(res),
  },
});
```

The resulting context includes:

- `req.headers`, `req.cookies`
- `res.setHeader`, `res.cookie`
- `user`: manager user or `null`
- `getUser()`: returns the user or throws `AUTH_REQUIRED`

Session cookies are managed with `getSessionCookie` and `setSessionCookie`.

## Media

Media uses a storage adapter:

```ts
createMediaService({
  adapter,
  defaultAccess: "private",
  defaultGetExpiresInSeconds: 300,
  uploadUrl: "/api/rakun/manager/media/upload",
});
```

APIs:

- `createMediaConnection(config)`: stores config without creating the service.
- `createMediaService(config)`: creates the singleton with an adapter.
- `getMediaService()`: returns the singleton or creates it from config.
- `handleMediaBinaryUpload`: processes manager binary uploads.

The service supports prepare/finalize upload, URL generation, folders, and image optimization depending on adapter/configuration.

## Literals and Translation

Bootstrap receives `literals`. Related utilities:

- `getTranslation`: resolves translatable values.
- `translateObject`: translates objects with translatable fields.
- `managerLiterals`: base manager texts.
- Manager schemas for listing/upserting literals.

Translatable values use this shape:

```ts
{
  _tag: "Translatable",
  en: "Title",
  es: "Titulo"
}
```

## Permissions

`lib/Permissions` exposes:

- `getPermissionList`: generates a permission list.
- `hasPermissions`: validates user/role permissions.
- `mapPermissions`: transforms permissions.
- `Permission`: public type.

Manager routes apply permissions, ownership, and auth through utilities in `api/utils`.

## Errors

Application errors live in `lib/errors`:

- `AppError`
- `throwAppError`
- `errors`
- `instanceofAppErrorShape`

Database errors live in `orm/dbService`:

- `DbError`
- `DbErrorUnknown`
- `DbErrorNotFound`
- `DbErrorInvalidData`
- `DbErrorConflict`
- `DbErrorSimulatedFailure`

## Runtime Flow

1. The app defines content types with `ContentType` and `Fields`.
2. The app calls `rakunBootstrap(options)`.
3. The HTTP adapter calls `ensureRakunInitialized()` before serving Rakun routes.
4. `ensureRakunInitialized()` configures logger, MongoDB, media, and route syncing.
5. Each request creates a `RakunRequestContext`.
6. Manager/web operations validate input, run logic, validate output, and return typed contracts.

## Tests and Development Notes

The package includes targeted tests next to modules (`*.test.ts`), for example ORM, translation, routes, redirects, and populated relations.

Package build:

```sh
bun run build --workspace @rakun-kit/core
```

The script generates ESM and CJS in `dist/`, adjusting imports and the CJS `package.json` through repo scripts.
