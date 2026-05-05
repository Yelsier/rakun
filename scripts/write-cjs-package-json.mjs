import { mkdir, writeFile } from "fs/promises";
import path from "path";

const [, , dirArg] = process.argv;

if (!dirArg) {
  console.error("Usage: node scripts/write-cjs-package-json.mjs <dir>");
  process.exit(1);
}

const outDir = path.resolve(process.cwd(), dirArg);

await mkdir(outDir, { recursive: true });
await writeFile(
  path.join(outDir, "package.json"),
  `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`,
  "utf8",
);
