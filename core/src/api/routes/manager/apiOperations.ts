import type { ApiOperationsOutput } from "../../../schemas/manager/apiOperations";
import type {
  RakunOperationContractMap,
  RakunOperationImplementationMap,
} from "../../operations/types";
import { createApiOperationCatalog } from "../../operations/catalog";
import {
  getCustomApiOperationDefinitions,
  mergeOperationMaps,
} from "../../operations/custom";
import { mergeOperationContracts } from "../../operations/types";
import { createWebOperationDefinitions } from "../../operations/web";

export const apiOperationsHandler = async <
  TContracts extends RakunOperationContractMap,
>({
  contracts,
  implementations,
}: {
  contracts: TContracts;
  implementations: RakunOperationImplementationMap<TContracts>;
}): Promise<ApiOperationsOutput> => {
  const managerOperations = mergeOperationMaps(
    mergeOperationContracts(contracts, implementations),
    getCustomApiOperationDefinitions("manager"),
  );
  const coreOperations = {
    ...managerOperations,
    ...createWebOperationDefinitions(),
  };
  const operations = mergeOperationMaps(
    coreOperations,
    getCustomApiOperationDefinitions("unscoped"),
  );

  return createApiOperationCatalog(operations);
};
