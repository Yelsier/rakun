import type { ApiOperationsOutput } from "../../../schemas/manager/apiOperations";
import type { RakunRequestContext } from "../../context";
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
import { checkPermissions } from "../../utils/checkPermissions";

export const apiOperationsHandler = async <
  TContracts extends RakunOperationContractMap,
>({
  contracts,
  implementations,
  ctx,
}: {
  contracts: TContracts;
  implementations: RakunOperationImplementationMap<TContracts>;
  ctx: RakunRequestContext;
}): Promise<ApiOperationsOutput> => {
  const user = ctx.getUser();
  checkPermissions(user, ["content.ApiOperation.readAny"]);

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
