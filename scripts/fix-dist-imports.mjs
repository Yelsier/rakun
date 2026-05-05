import { readdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

const [, , distArg] = process.argv;

if (!distArg) {
  console.error("Usage: node scripts/fix-dist-imports.mjs <dist-dir>");
  process.exit(1);
}

const distDir = path.resolve(process.cwd(), distArg);

const sourceFilePattern = /\.(js|d\.ts)$/;
const explicitExtensionPattern = /\.(?:[cm]?js|json)$/;

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(entryPath)));
      continue;
    }

    if (sourceFilePattern.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
};

const resolveRuntimeSpecifier = async (filePath, specifier) => {
  if (specifier.startsWith("@/")) {
    const resolvedBase = path.resolve(distDir, specifier.slice(2));
    const fileCandidate = `${resolvedBase}.js`;
    const indexCandidate = path.join(resolvedBase, "index.js");

    if ((await stat(fileCandidate).catch(() => null))?.isFile()) {
      const relativePath = path.relative(path.dirname(filePath), fileCandidate);
      return ensureRelativePrefix(normalizeSpecifier(relativePath));
    }

    if ((await stat(indexCandidate).catch(() => null))?.isFile()) {
      const relativePath = path.relative(path.dirname(filePath), indexCandidate);
      return ensureRelativePrefix(normalizeSpecifier(relativePath));
    }

    return specifier;
  }

  if (!specifier.startsWith(".")) {
    return specifier;
  }

  if (explicitExtensionPattern.test(specifier)) {
    return specifier;
  }

  const resolvedBase = path.resolve(path.dirname(filePath), specifier);
  const fileCandidate = `${resolvedBase}.js`;
  const indexCandidate = path.join(resolvedBase, "index.js");

  if ((await stat(fileCandidate).catch(() => null))?.isFile()) {
    return `${specifier}.js`;
  }

  if ((await stat(indexCandidate).catch(() => null))?.isFile()) {
    return `${specifier}/index.js`;
  }

  return specifier;
};

const normalizeSpecifier = (value) => value.split(path.sep).join("/");

const ensureRelativePrefix = (value) =>
  value.startsWith(".") ? value : `./${value}`;

const rewriteFile = async (filePath) => {
  const original = await readFile(filePath, "utf8");
  let next = original;

  const patterns = [
    /(from\s+["'])([^"']+)(["'])/g,
    /(import\s*\(\s*["'])([^"']+)(["']\s*\))/g,
    /(export\s+\*\s+from\s+["'])([^"']+)(["'])/g,
    /(import\s+["'])([^"']+)(["'])/g,
    /(require\(\s*["'])([^"']+)(["']\s*\))/g,
  ];

  for (const pattern of patterns) {
    const matches = Array.from(next.matchAll(pattern));

    for (const match of matches) {
      const [, prefix, specifier, suffix] = match;
      const rewritten = await resolveRuntimeSpecifier(filePath, specifier);

      if (rewritten === specifier) {
        continue;
      }

      next = next.replace(
        `${prefix}${specifier}${suffix}`,
        `${prefix}${rewritten}${suffix}`,
      );
    }
  }

  if (next !== original) {
    await writeFile(filePath, next, "utf8");
  }
};

const main = async () => {
  const files = await walk(distDir);

  for (const filePath of files) {
    await rewriteFile(filePath);
  }
};

await main();
