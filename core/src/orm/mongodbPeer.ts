import { requirePeerDependency } from "../lib/utils/peerDependencies";

type MongoDB = typeof import("mongodb");

export const getMongoDB = () =>
  requirePeerDependency<MongoDB>(
    "mongodb",
    "npm install mongodb",
    "Rakun uses the official MongoDB driver for database access and ObjectId handling.",
  );
