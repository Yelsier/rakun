export {
  createManagerOperationContracts,
} from "./manager-contract";
import { createManagerOperationDefinitions } from "./manager";
export { createWebOperationContracts } from "./web-contract";
import { createWebOperationDefinitions } from "./web";
import {
  getCustomApiOperationDefinitions,
  mergeOperationMaps,
} from "./custom";
import { traceOperationMap } from "./tracing";

export const createRakunOperationDefinitions = () => {
  const coreOperations = {
    ...createManagerOperationDefinitions(),
    ...createWebOperationDefinitions(),
  };

  return traceOperationMap(
    mergeOperationMaps(
      coreOperations,
      getCustomApiOperationDefinitions("unscoped"),
    ),
  );
};

export { createManagerOperationDefinitions, createWebOperationDefinitions };
export {
  getCustomApiOperationDefinitions,
  mergeOperationMaps,
  type RakunOperationNamespace,
} from "./custom";
export {
  type AnyRakunOperation,
  type AnyRakunOperationContract,
  createOperationManifest,
  createOperationPath,
  defineOperation,
  defineOperationContract,
  mergeOperationContracts,
  type RakunOperationAccess,
  type RakunOperationContractDefinition,
  type RakunOperationContractMap,
  type RakunOperationDefinitionFromContract,
  type RakunOperationDefinition,
  type RakunOperationHttpMethod,
  type RakunOperationImplementationFromContract,
  type RakunOperationImplementationMap,
  type RakunOperationKind,
  type RakunOperationManifestFromContracts,
  type RakunOperationMeta,
  type RakunOperationMap,
  type RakunOperationSuccessArgs,
} from "./types";
