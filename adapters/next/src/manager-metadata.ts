import type { Metadata } from "next";
import {
  resolveManagerSeoCopy,
  type ManagerSeoMessages,
} from "@rakun-kit/manager-react/seo";

export type CreateRakunManagerMetadataOptions = {
  title?: string;
  description?: string;
  /** Locale pack messages (or a subset). Uses `seo.title` / `seo.description`. */
  messages?: ManagerSeoMessages;
};

/**
 * Server-safe Next.js metadata for manager mount pages.
 * Pass this from the host `page.tsx` via `export const metadata`.
 * It does not import React client modules.
 *
 * @example
 * ```ts
 * import { esManagerMessages } from '@rakun-kit/manager-locales/es'
 * export const metadata = createRakunManagerMetadata({ messages: esManagerMessages })
 * ```
 */
export const createRakunManagerMetadata = (
  options: CreateRakunManagerMetadataOptions = {},
): Metadata => {
  const copy = resolveManagerSeoCopy(options.messages);

  return {
    title: options.title ?? copy.title,
    description: options.description ?? copy.description,
    robots: {
      index: false,
      follow: false,
    },
  };
};
