import { AsyncLocalStorage } from "node:async_hooks";

import type { ContentHookContextStorage } from "../../lib/hooks";

const storage = new AsyncLocalStorage<ContentHookContextStorage>();

export function runContentHookContext<T>(
  context: ContentHookContextStorage,
  callback: () => T,
): T {
  return storage.run(
    {
      ...storage.getStore(),
      ...context,
    },
    callback,
  );
}

export function getContentHookContext(): ContentHookContextStorage {
  return storage.getStore() ?? {};
}
