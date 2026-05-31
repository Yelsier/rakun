import { MongoClient } from "mongodb";

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);

const getOption = (name, fallback) => {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
};

const usage = () => {
  console.log(`Usage:
  MONGO_URI="mongodb://localhost:27017/rakun" node scripts/migrate-media-urls.mjs [--write]

Options:
  --write                 Apply changes. Without this flag it only prints a dry-run.
  --collection <name>     Media collection name. Default: Media
  --db <name>             Database name. Optional when MONGO_URI includes the db.
  --help                  Show this help.

This removes stored absolute URLs from Media documents:
  - url
  - previewUrl
  - sizes[].url

After deploying the dynamic URL code, Rakun computes URLs from key/access and the
current media adapter config.`);
};

if (hasFlag("--help")) {
  usage();
  process.exit(0);
}

const mongoUri = process.env.MONGO_URI;
const dbName =
  getOption("--db") ||
  process.env.MONGO_DB ||
  process.env.MONGO_DB_NAME ||
  process.env.MONGODB_DB;
const collectionName = getOption("--collection", "Media");
const shouldWrite = hasFlag("--write");

if (!mongoUri) {
  console.error("MONGO_URI is required.");
  usage();
  process.exit(1);
}

const hasOwn = (value, key) =>
  Object.prototype.hasOwnProperty.call(value, key);

const cleanSizes = (sizes) => {
  if (!Array.isArray(sizes)) {
    return {
      changed: false,
      value: sizes,
    };
  }

  let changed = false;
  const value = sizes.map((size) => {
    if (!size || typeof size !== "object" || Array.isArray(size)) return size;
    if (!hasOwn(size, "url")) return size;

    changed = true;
    const { url: _url, ...rest } = size;
    return rest;
  });

  return {
    changed,
    value,
  };
};

const buildUpdate = (doc) => {
  const unset = {};
  const set = {};
  const cleanedSizes = cleanSizes(doc.sizes);

  if (hasOwn(doc, "url")) unset.url = "";
  if (hasOwn(doc, "previewUrl")) unset.previewUrl = "";
  if (cleanedSizes.changed) set.sizes = cleanedSizes.value;

  return {
    update: {
      ...(Object.keys(unset).length ? { $unset: unset } : {}),
      ...(Object.keys(set).length ? { $set: set } : {}),
    },
    changed: Object.keys(unset).length > 0 || Object.keys(set).length > 0,
  };
};

const formatId = (id) =>
  id && typeof id.toString === "function" ? id.toString() : String(id);

const client = new MongoClient(mongoUri);

try {
  await client.connect();
  const db = dbName ? client.db(dbName) : client.db();
  const collection = db.collection(collectionName);
  const filter = {
    $or: [
      { url: { $exists: true } },
      { previewUrl: { $exists: true } },
      { "sizes.url": { $exists: true } },
    ],
  };

  const cursor = collection.find(filter);
  let scanned = 0;
  let changed = 0;
  let updated = 0;
  const sampleIds = [];

  for await (const doc of cursor) {
    scanned += 1;
    const { update, changed: docChanged } = buildUpdate(doc);

    if (!docChanged) continue;

    changed += 1;
    if (sampleIds.length < 10) sampleIds.push(formatId(doc._id));

    if (shouldWrite) {
      const result = await collection.updateOne({ _id: doc._id }, update);
      updated += result.modifiedCount;
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: shouldWrite ? "write" : "dry-run",
        database: db.databaseName,
        collection: collectionName,
        scanned,
        matchedForCleanup: changed,
        updated,
        sampleIds,
      },
      null,
      2,
    ),
  );

  if (!shouldWrite && changed > 0) {
    console.log("\nDry-run only. Re-run with --write to apply.");
  }
} finally {
  await client.close();
}
