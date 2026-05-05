# @rakun/manager-react

React manager UI and client utilities for Rakun.

Most apps use this package through framework adapters such as
`@rakun/next/manager`, but the runtime components and clients are also
published for custom integrations.

## Browser App

Render the manager with a manager client and navigation implementation:

```tsx
import {
  ManagerBrowserApp,
  createHttpManagerClient,
} from "@rakun/manager-react";
import "@rakun/manager-react/styles.css";

const client = createHttpManagerClient({
  baseUrl: "/api/rakun",
});

export function ManagerPage() {
  return (
    <ManagerBrowserApp
      client={client}
      pathname={window.location.pathname}
      basePath="/backend"
    />
  );
}
```

`ManagerBrowserApp` creates browser path navigation by default. Use
`ManagerRuntimeApp` when you need to provide custom navigation.

## Clients

HTTP client:

```ts
import { createHttpManagerClient } from "@rakun/manager-react/client/http";

const client = createHttpManagerClient({
  baseUrl: "/api/rakun",
});

const contentTypes = await client.request("manager.contentTypes");
```

tRPC client adapter:

```ts
import { createTrpcManagerClient } from "@rakun/manager-react/client/trpc";

const managerClient = createTrpcManagerClient(trpcProxyClient);
```

Custom client:

```ts
import { createManagerClient } from "@rakun/manager-react/client/request";

const client = createManagerClient(async (name, input, options) => {
  // call your transport here
});
```

## Navigation

Use `createPathManagerNavigation` for router integrations:

```ts
import { createPathManagerNavigation } from "@rakun/manager-react/state/navigation";

const navigation = createPathManagerNavigation({
  basePath: "/backend",
  push: (href) => router.push(href),
  replace: (href) => router.replace(href),
});
```

## Styles

Import the package stylesheet once:

```ts
import "@rakun/manager-react/styles.css";
```

## Exports

- `@rakun/manager-react`: manager app, providers, clients, navigation, router, layout, media, and state helpers.
- `@rakun/manager-react/client/http`: HTTP manager client.
- `@rakun/manager-react/client/request`: transport-agnostic manager client.
- `@rakun/manager-react/client/trpc`: tRPC proxy client adapter.
- `@rakun/manager-react/app/runtime-app`: `ManagerRuntimeApp`, `ManagerBrowserApp`.
- `@rakun/manager-react/state/navigation`: navigation helpers and provider.
- `@rakun/manager-react/link`: link component provider.
- `@rakun/manager-react/styles.css`: bundled manager styles.

## Build

```sh
npm run build --workspace @rakun/manager-react
```
