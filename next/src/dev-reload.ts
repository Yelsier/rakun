import { watch, utimesSync } from "node:fs";
import { resolve } from "node:path";

export type WatchRakunDevFilesOptions = {
  /** Absolute paths to content-type / bootstrap source files. */
  watch: readonly string[];
  /**
   * Absolute paths that Next should recompile when watched files change.
   * Typically the API route entry that calls `rakunNext`.
   */
  reloadEntries: readonly string[];
  debounceMs?: number;
};

const startedWatchers = new Set<string>();

/**
 * In development, touch Next route entry files when bootstrap sources change
 * so Turbopack re-evaluates content types without a full server restart.
 */
export const watchRakunDevFiles = (
  options: WatchRakunDevFilesOptions,
): void => {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const watchPaths = options.watch.map((file) => resolve(file));
  const reloadEntries = options.reloadEntries.map((file) => resolve(file));
  const key = `${watchPaths.join("|")}=>${reloadEntries.join("|")}`;

  if (startedWatchers.has(key)) {
    return;
  }

  startedWatchers.add(key);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const debounceMs = options.debounceMs ?? 50;

  const touchEntries = () => {
    const now = new Date();

    for (const entry of reloadEntries) {
      try {
        utimesSync(entry, now, now);
      } catch {
        // Entry may not exist yet during boot.
      }
    }

    console.info(
      "[rakun] bootstrap source changed — reloading API route for content types",
    );
  };

  for (const file of watchPaths) {
    try {
      watch(file, { persistent: false }, () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(touchEntries, debounceMs);
      });
    } catch {
      // Ignore missing files during boot; Next will still load once they exist.
    }
  }
};
