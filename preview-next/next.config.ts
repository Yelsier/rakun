import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(rootDir, "..");
const managerSrc = path.resolve(repoRoot, "manager-react/src");

const rakunServerPackages = [
  "@rakun-kit/core",
  "@rakun-kit/express",
  "@rakun-kit/next",
  "@rakun-kit/s3",
  "@rakun-kit/trpc",
] as const;

const isRakunServerPackage = (request: string) =>
  request !== "@rakun-kit/next/manager" &&
  rakunServerPackages.some(
    (pkg) => request === pkg || request.startsWith(`${pkg}/`),
  );

const nextConfig: NextConfig = {
  turbopack: {
    root: repoRoot,
  },
  serverExternalPackages: [...rakunServerPackages],
  webpack: (config, { isServer, nextRuntime }) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@": managerSrc,
    };

    if (isServer && nextRuntime === "nodejs") {
      const rakunExternals = (
        { request }: { request?: string },
        callback: (error?: Error | null, result?: string) => void,
      ) => {
        if (request && isRakunServerPackage(request)) {
          callback(null, `commonjs ${request}`);
          return;
        }

        callback();
      };

      if (Array.isArray(config.externals)) {
        config.externals.push(rakunExternals);
      } else if (config.externals) {
        config.externals = [config.externals, rakunExternals];
      } else {
        config.externals = [rakunExternals];
      }
    }

    return config;
  },
};

export default nextConfig;
