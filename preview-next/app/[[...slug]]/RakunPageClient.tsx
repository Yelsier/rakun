"use client";

import { PageOutput } from "@rakun-kit/next";
import { PageLayoutRenderer } from "@rakun-kit/next/web/client";

export function RakunPageClient({ page }: { page: PageOutput }) {
  return (
    <PageLayoutRenderer
      page={page}
      loadModule={(name) => import(`../../modules/${name}`)}
    />
  );
}
