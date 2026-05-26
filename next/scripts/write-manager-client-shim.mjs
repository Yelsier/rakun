import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distDir = path.join(packageDir, "dist");

await mkdir(distDir, { recursive: true });

await writeFile(
  path.join(distDir, "manager-client.js"),
  "export { RakunManagerClientPage } from './esm/manager-client.js'\n",
  "utf8",
);

await writeFile(
  path.join(distDir, "manager-client.d.ts"),
  [
    "export type { RakunManagerClientPageProps } from './esm/manager-client.js'",
    "export { RakunManagerClientPage } from './esm/manager-client.js'",
    "",
  ].join("\n"),
  "utf8",
);
