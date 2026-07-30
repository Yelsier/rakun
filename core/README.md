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
- Mail: `createMailService`, `sendMail`, typed template registries, adapters, and types.
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
- `apiOperations`: custom API operations added to the Rakun operation registry.
- `mongo`: MongoDB connection. Required before serving Rakun requests.
- `media`: media adapter/configuration. Optional.
- `mail`: outbound mail adapter and default sender configuration. Optional.
- `logger`: logger configuration. If omitted, an `info` logger with `prettify` is created.
- `syncRoutes`: syncs configured routes during initialization. Enabled by default.

Content types can define lifecycle `hooks` and opt into manager-selected
`dynamicData` sources.

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

## Module picker

Content types used as iterator modules can customize their card in the manager's
add-module dialog. `modulePicker.preview` accepts an image URL available to the
manager browser; relative URLs are also supported:

```ts
const Hero = new ContentType({
  name: "Hero",
  modulePicker: {
    title: "Hero section",
    description: "Large introduction with heading, copy, and CTA.",
    category: "Marketing",
    icon: "PanelTop",
    preview: "/images/modules/hero.webp",
    keywords: ["banner", "cover"],
  },
  fields: {
    title: Fields.string().required(),
  },
});
```

When `preview` is omitted or cannot be loaded, the picker displays a neutral
placeholder so module cards keep a consistent height.

`ensureRakunInitialized()` prepares logger, MongoDB, media, and route syncing. It uses a singleton promise to avoid concurrent initialization; if initialization fails, the promise is cleared so the next call can retry.

`ensureRakunBootstrap(options)` only calls `rakunBootstrap` if the runtime has not been bootstrapped yet.

English is built into `@rakun-kit/manager-react`. Install only the extra
manager UI locales an application needs:

```sh
bun add @rakun-kit/manager-locales
# or: npm install @rakun-kit/manager-locales
```

Import the required language subpath and register it with `managerLanguages`;
the public `manager.uiLocales` operation returns configured packs to the
manager client:

```ts
import { esManagerLocalePack } from '@rakun-kit/manager-locales/es'

rakunBootstrap({
  // ...
  managerLanguages: [esManagerLocalePack],
})
```

`managerLanguages` may also extend locales with arbitrary project keys. This is
useful for translatable content-type titles and categories without adding host
keys to the manager's static `ManagerMessageKey` union:

```ts
import { extendManagerLanguagePack } from '@rakun-kit/core/contracts'
import { esManagerLocalePack } from '@rakun-kit/manager-locales/es'

rakunBootstrap({
  // ...
  managerLanguages: [
    {
      code: 'en',
      name: 'English',
      messages: {
        'field.title': 'Title',
        'layoutModule.header': 'Header',
        'project.contentTypes.article.menu': 'Articles',
      },
    },
    extendManagerLanguagePack(esManagerLocalePack, {
      'field.title': 'Título',
      'layoutModule.header': 'Cabecera',
      'project.contentTypes.article.menu': 'Artículos',
    }),
  ],
})
```

Content-type field labels automatically use `field.<fieldName>` from these
project messages. Missing translations fall back to a built-in manager label
when available and otherwise to the humanized field name.

Route layout module labels use `layoutModule.<layoutKey>`, so a slot configured
with `key: 'header'` resolves `layoutModule.header`.

## Plugins

Trusted server plugins contribute to the same bootstrap registry without coupling
core to React:

```ts
import { defineRakunPlugin, rakunBootstrap } from '@rakun-kit/core'

export const analyticsPlugin = defineRakunPlugin({
  id: '@acme/rakun-analytics',
  contentTypes: [AnalyticsEvent],
  routes: analyticsRoutes,
  apiOperations: analyticsOperations,
  permissions: ['plugin.analytics.view'],
  literals: {},
  initialize: async ({ db }) => {
    // Services and migrations are ready here. Keep initialization idempotent.
  },
})

rakunBootstrap({
  plugins: [analyticsPlugin],
  contentTypes: [],
  literals: {},
  mongo,
})
```

Plugin ids and contributed content types, routes, operations, literals, and
custom field editor ids must be unique. Rakun reports both owners on conflicts.
Visual manager and web facets are registered separately in their browser
runtimes.

Custom field factories can use `createPluginField`. Their serializable
`meta.editor` must match a field declaration in the server plugin and a React
editor registered by its manager facet.

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

Page-like content types can define ordered page modules with `iterator` outside
`fields`. Rakun persists this generated field as `_iterator`:

```ts
const Page = new ContentType({
  name: "Page",
  fields: {
    title: Fields.string().required(),
    slug: Fields.string().type("Slug").required(),
  },
  iterator: [{ contentType: PageSection, type: "existing" }],
  linkedIterator: true,
});
```

Set `linkedIterator: true` when every document should use one shared module
structure. The manager stores a canonical iterator for the content type, while
dynamic bindings such as `Current document` continue to resolve against the
individual page being rendered. Documents are linked by default and can be
unlinked in the manager to keep a local copy of the iterator.

Iterator modules can also be made conditional from the manager. A condition is
stored on the shared module entry and evaluated against the current document:

```ts
{
  name: "Credits",
  value: { /* module relation */ },
  visibleWhen: {
    field: "credits",
    operator: "notEmpty",
  },
}
```

Supported operators are `notEmpty` and `empty`. Conditional modules remain part
of the shared structure but are omitted from web and preview output when their
condition does not match.

Main properties:

- `name`: stable type name. Also used as `_type`.
- `fields`: field map.
- `iterator`: page module entries. Generates the reserved `_iterator` field.
- `linkedIterator`: shares that iterator between documents while allowing
  explicit per-document overrides.
- `menu`: manager metadata.
- `uniques`: unique field groups.
- `listFields`: preferred fields in lists and relations.
- `hideFromManager()`: hides the content type from manager content type lists.
- `apiOnly()`: applies `.apiOnly()` to every field in the content type.
- `managerOnly()`: applies `.managerOnly()` to every field in the content type.
- Saved manager documents support comments and user mentions by default.
- `withHooks()`: attaches lifecycle hooks such as `beforeInsert`, `beforeUpdate`, and `onGet`.
- Dynamic data bindings are available on manager-visible fields by default; use
  field-level `.noDynamic()` to opt out.

When a content type has a configured route with `hasPage: true`, Rakun also
adds an optional reserved `_seo` relation automatically.

Hooks run around DB mutations and public output resolution:

```ts
const User = new ContentType({
  name: "User",
  fields: {
    email: Fields.string().type("Email").required(),
    password: Fields.string().type("Password").required().managerOnly(),
  },
}).withHooks({
  beforeInsert: ({ data }) => ({
    ...data,
    password: hashPassword(String(data.password)),
  }),
  onGet: ({ data }) => ({
    ...data,
    displayName: String(data.email).split("@")[0],
  }),
});
```

Dynamic data turns a content type into a reusable layout. The manager can bind
manager-visible fields to another content item field, or to a generated `href`
when a source content type has a page route. Fields are dynamic by default; call
`.noDynamic()` on fields that should not accept bindings or be exported as
source paths. Source content types are hidden by default; set
`dynamicDataSource: true` on content types that should appear in the manager
source selector. Field bindings can also select `Current document` to read values
from the document being edited without marking its content type as a source.

Source field selectors are type-aware. A string target only offers string-like
source paths, number targets only offer numbers, and boolean targets only offer
booleans. Object-like source fields are traversed so nested leaf fields can be
selected, while reserved SEO metadata is omitted from dynamic data mappings.
The generated `href` source is only shown for content types that have a
configured route with `hasPage: true`.

```ts
const Project = new ContentType({
  name: "Project",
  dynamicDataSource: true,
  fields: {
    title: Fields.string().required(),
    slug: Fields.string().type("Slug").required(),
  },
});

const Carousel = new ContentType({
  name: "Carousel",
  fields: {
    title: Fields.string().required(),
    internalNote: Fields.string().noDynamic(),
    items: Fields.blocks([
      {
        name: "CarouselItem",
        field: Fields.relation(CarouselItem, "new"),
      },
    ]),
  },
});
```

List bindings append dynamic items to manually stored items instead of replacing
the list. If the same stable item id appears in both sources, the dynamically
resolved item wins and the duplicate manual copy is skipped.

A list inside a nested module can also use a compatible relation or blocks array
from the current document. The manager exposes these sources as
`Current document · <field>`, infers the content type of each array item, and
lets each item be mapped with the same field mapping UI used for collections.
These bindings store a `currentDocument` source alongside the inferred item
content type:

```ts
const headerBindings = {
  lists: {
    categories: {
      contentType: LinkItem.name,
      source: {
        kind: "currentDocument",
        contentType: Project.name,
        path: "categories",
        itemName: "Category",
      },
      itemName: "Category",
      map: {
        title: { contentType: LinkItem.name, path: "title" },
        href: { contentType: LinkItem.name, path: "href" },
      },
    },
  },
};
```

List query conditions can compare a source field with a value from the current
document. The manager exposes this as `Current document`; programmatic bindings
use `{ $current: "path.to.field" }`. For example, a category can query only the
projects whose related category has the same slug:

```ts
query: {
  filter: {
    "category.slug": { $current: "slug" },
  },
  options: { limit: 10 },
}
```

Current-document paths are checked against the content type's dynamic field
rules before the query runs. `_id` is also available for relation queries.

A list mapping can also collect an array through a reverse relation without
persisting that relation on the source document. For example, a category gallery
can create one item per `Category` and collect the images of its related
`Project` documents:

```ts
const Category = new ContentType({
  name: "Category",
  dynamicDataSource: true,
  fields: {
    title: Fields.string().required(),
  },
});

const Project = new ContentType({
  name: "Project",
  dynamicDataSource: true,
  fields: {
    category: Fields.relation(Category, "existing").required(),
    images: Fields.file().type("Image").multiple().required(),
  },
});

const galleryBindings = {
  lists: {
    items: {
      contentType: Category.name,
      itemName: "CategoriesGalleryItem",
      map: {
        title: { contentType: Category.name, path: "title" },
        images: {
          kind: "relatedCollection",
          contentType: Project.name,
          relation: "category",
          path: "images",
          limit: 10,
        },
      },
    },
  },
};
```

The related collection query matches `Project.category._id` against the current
category, preserves project and image order, and flattens the selected array by
one level. Its numeric limit applies to related projects and is capped at 100.

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
- Manager comments and mentions: `manager.comments.list`,
  `manager.comments.create`, `manager.comments.toggleReaction`,
  `manager.comments.markRead`, `manager.comments.unreadCount`,
  `manager.users.mentions`,
  `manager.notifications.list`, and `manager.notifications.markRead`.
- Web: page resolution.

Main helpers:

- `defineOperationContract`: declares a contract with Zod input/output, method, path, and metadata.
- `defineOperation`: combines a contract with its implementation.
- `createRakunApiClient`: creates a browser/server HTTP client for custom operations.
- `GetClient`: derives a typed client from an operation map.
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

Applications can define operations in a separate object, pass that object to
bootstrap, and reuse its type on the frontend:

```ts
// server/api-operations.ts
import { defineOperation } from "@rakun-kit/core";
import { z } from "zod";

export const apiOperations = {
  "demo.helloWorld": defineOperation<
    { text: string },
    { message: string },
    "query",
    "get",
    "public"
  >({
    access: "public",
    kind: "query",
    method: "get",
    description: "Return a hello world message with the provided text",
    input: z.object({
      text: z.string().default("world"),
    }),
    output: z.object({
      message: z.string(),
    }),
    resolve: ({ input }) => ({
      message: `Hello ${input.text}`,
    }),
  }),
};
```

```ts
// bootstrap
import { apiOperations } from "./server/api-operations";

rakunBootstrap({
  // ...
  apiOperations,
});
```

Operation names define their HTTP path: `demo.helloWorld` becomes
`/demo/helloWorld`.

Rules:

- Names must not collide with built-in operations.
- Operations prefixed with `manager.` are included in manager operation routers.
- Operations prefixed with `web.` are included in web operation routers.
- Operations with any other prefix are included when using the combined operation registry.
- Use `access: "public"` for operations called from public web pages.
- Use `access: "auth"` for operations that require a manager session.

The manager route `manager.apiOperations` returns a JSON-serializable operation
catalog for manager API docs/playgrounds. Input and output Zod schemas are
converted to JSON Schema for display.

### Typed API Client

`@rakun-kit/core/web` exposes a small typed HTTP client for operation maps:

```ts
import {
  createRakunApiClient,
  type GetClient,
} from "@rakun-kit/core/web";
import type { apiOperations } from "./server/api-operations";

type ApiClient = GetClient<typeof apiOperations>;

const client: ApiClient = createRakunApiClient<typeof apiOperations>({
  baseUrl: "/api",
});

const result = await client.query("demo.helloWorld", {
  text: "Rakun",
});

result.message;
```

The client exposes:

- `query(name, input?, options?)`: only accepts operations with `kind: "query"`.
- `mutation(name, input?, options?)`: only accepts operations with `kind: "mutation"`.

The client derives input and output types from the Zod schemas in
`apiOperations`.

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

## Persistent Event Log

Rakun keeps business/audit events separate from its technical console logger.
The event log uses an append-only adapter and defaults to a MongoDB collection
with indexes for time, type, category, outcome, severity, correlation and tags:

```ts
import { recordEvent, queryEvents } from "@rakun-kit/core";

await recordEvent({
  type: "content.article.published",
  category: "content",
  outcome: "success",
  actor: { type: "manager-user", id: userId },
  resource: { type: "Article", id: articleId },
  correlationId: requestId,
  tags: ["editorial"],
  data: {
    locale: "es",
    changedFields: 3,
  },
});

const page = await queryEvents({
  categories: ["content"],
  outcomes: ["success"],
  from: new Date("2026-01-01T00:00:00.000Z"),
  limit: 50,
});
```

`data` accepts nested JSON values. Event queries use cursor pagination and can
filter by types, categories, severities, outcomes, sources, correlation,
required tags and a date range. A custom persistence implementation can be
plugged in globally:

```ts
import type { EventLogAdapter } from "@rakun-kit/core";

const adapter: EventLogAdapter = {
  async append(event) {
    return customStore.append(event);
  },
  async query(filters) {
    return customStore.query(filters);
  },
};

rakunBootstrap({
  // ...
  eventLog: { adapter },
});
```

Plugins receive the resolved `eventLog` service in their initialization
context. Reading a shared event stream should be protected with the built-in
`system.eventLog.read` permission. The built-in `manager.logs.list` operation and the
manager Settings → Logs screen both enforce it.

Failed API operations are persisted automatically as `api.operation.failed`
events. This includes expected 4xx application errors and unexpected 5xx
failures across the core operation wrapper and the Express, Next.js, and tRPC
adapters. Events include the operation, status, method, kind, correlation ID,
and authenticated actor when available. Request payloads, application error
causes, and raw internal error messages are not persisted.

## Mail

Mail providers receive normalized, already-rendered messages through
`MailAdapter`, so neither `core` nor an adapter depends on React or a template
engine:

```ts
import type { MailAdapter } from '@rakun-kit/core'

const adapter: MailAdapter = {
  async send(message) {
    const result = await provider.send(message)
    return { id: result.id }
  },
}

rakunBootstrap({
  // ...
  mail: {
    adapter,
    defaultFrom: 'hello@example.com',
    defaultReplyTo: 'support@example.com',
  },
})
```

Send rendered content directly:

```ts
import { sendMail } from '@rakun-kit/core'

await sendMail({
  to: 'ada@example.com',
  subject: 'Welcome',
  html: '<p>Hello Ada</p>',
  text: 'Hello Ada',
})
```

Or create a typed application template registry:

```ts
import { createMailSender, defineMailTemplate } from '@rakun-kit/core'

const mail = createMailSender({
  templates: {
    welcome: defineMailTemplate<{ name: string }>({
      subject: ({ name }) => `Welcome, ${name}`,
      render: ({ name }) => ({
        html: `<p>Hello ${name}</p>`,
        text: `Hello ${name}`,
      }),
    }),
  },
})

await mail.send({
  template: 'welcome',
  props: { name: 'Ada' },
  to: 'ada@example.com',
})
```

The common contract supports To/CC/BCC/Reply-To, custom headers and in-memory
`Uint8Array` attachments. Sending is immediate; queues, retries and delivery
events belong to application infrastructure.

Every mail sent through a bootstrapped Rakun mail service creates append-only
`mail.send.attempted` and `mail.send.succeeded` or `mail.send.failed` events.
They share a correlation id and include only operational counts, provider,
template and duration. Recipient addresses, subject, HTML/text, headers,
attachment names/content, credentials and raw provider errors are never copied
to the persistent event log. If the initial attempt event cannot be persisted,
the provider is not called.

## Literals and Translation

Bootstrap receives `literals`. Related utilities:

- `getTranslation`: resolves translatable values.
- `translateObject`: translates objects with translatable fields.
- Manager schemas for listing/upserting website literals (not manager UI chrome).


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
4. `ensureRakunInitialized()` configures logger, MongoDB, the persistent event
   log, media, mail, and route syncing.
5. Each request creates a `RakunRequestContext`.
6. Manager/web operations validate input, run logic, validate output, and return typed contracts.

## Tests and Development Notes

The package includes targeted tests next to modules (`*.test.ts`), for example ORM, translation, routes, redirects, and populated relations.

Package build:

```sh
bun run build --workspace @rakun-kit/core
```

The script generates ESM and CJS in `dist/`, adjusting imports and the CJS `package.json` through repo scripts.
