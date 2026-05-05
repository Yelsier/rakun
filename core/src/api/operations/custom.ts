import { getRakunBootstrapOptions } from "../../bootstrapState";

import type { RakunOperationMap } from "./types";

export type RakunOperationNamespace = "manager" | "web" | "unscoped";

const filterOperationsByNamespace = (
  operations: RakunOperationMap,
  namespace?: RakunOperationNamespace,
): RakunOperationMap => {
  if (!namespace) {
    return operations;
  }

  if (namespace === "unscoped") {
    return Object.fromEntries(
      Object.entries(operations).filter(
        ([name]) => !name.startsWith("manager.") && !name.startsWith("web."),
      ),
    );
  }

  return Object.fromEntries(
    Object.entries(operations).filter(([name]) =>
      name.startsWith(`${namespace}.`),
    ),
  );
};

export const getCustomApiOperationDefinitions = (
  namespace?: RakunOperationNamespace,
): RakunOperationMap => {
  const operations = getRakunBootstrapOptions()?.apiOperations ?? {};

  return filterOperationsByNamespace(operations, namespace);
};

export const mergeOperationMaps = <
  TBase extends RakunOperationMap,
  TExtra extends RakunOperationMap,
>(
  base: TBase,
  extra: TExtra,
): TBase & TExtra => {
  const duplicated = Object.keys(extra).filter((name) => name in base);

  if (duplicated.length > 0) {
    throw new Error(
      `Rakun API operation already exists: ${duplicated.join(", ")}`,
    );
  }

  return {
    ...base,
    ...extra,
  } as TBase & TExtra;
};
