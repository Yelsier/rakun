import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(rootDir, "..");
const managerSrc = path.resolve(repoRoot, "manager-react/src");
const coreSrc = path.resolve(repoRoot, "core/src");

export default ({ mode }: { mode: string }) => {
  const env = loadEnv(mode, rootDir, "");
  const apiBasePath = env.API_BASE_PATH || "/api/rakun";
  const managerBasePath = env.MANAGER_BASE_PATH || "/backend";
  const apiPort = Number(env.PORT || 4100);

  return {
    plugins: [react() as unknown],
    envDir: rootDir,
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
        env.VITE_API_BASE_URL || apiBasePath,
      ),
      "import.meta.env.VITE_MANAGER_BASE_PATH": JSON.stringify(
        env.VITE_MANAGER_BASE_PATH || managerBasePath,
      ),
    },
    server: {
      port: Number(env.VITE_PORT || 5173),
      fs: {
        allow: [repoRoot],
      },
      proxy: {
        [apiBasePath]: {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: [
        { find: "@", replacement: managerSrc },
        { find: /^@rakun\/manager-react\/(.+)$/, replacement: `${managerSrc}/$1` },
        { find: "@rakun/manager-react", replacement: path.resolve(managerSrc, "index.ts") },
        { find: "@rakun/core/client", replacement: path.resolve(coreSrc, "client.ts") },
        { find: "@rakun/core/contracts", replacement: path.resolve(coreSrc, "contracts.ts") },
        { find: "@rakun/core/manager", replacement: path.resolve(coreSrc, "manager.ts") },
        {
          find: "@rakun/core/internal-content-types",
          replacement: path.resolve(coreSrc, "internal-content-types/index.ts"),
        },
        {
          find: /^@rakun\/core\/internal-content-types\/(.+)$/,
          replacement: `${coreSrc}/internal-content-types/$1.ts`,
        },
        { find: "@rakun/core/types", replacement: path.resolve(coreSrc, "lib/types/index.ts") },
        { find: /^@rakun\/core\/lib\/fields\/(.+)$/, replacement: `${coreSrc}/lib/fields/$1.ts` },
        { find: /^@rakun\/core\/lib\/utils\/(.+)$/, replacement: `${coreSrc}/lib/utils/$1.ts` },
        { find: /^@rakun\/core\/lib\/(.+)$/, replacement: `${coreSrc}/lib/$1.ts` },
        { find: "@rakun/core", replacement: path.resolve(coreSrc, "index.ts") },
      ],
    },
    optimizeDeps: {
      exclude: ["@rakun/manager-react", "@rakun/core"],
    },
  };
};
