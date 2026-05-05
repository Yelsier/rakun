import {
  createManagerOperationDefinitions,
} from "@rakun/core";

import { createRouterFromOperations } from "../router";

export function createManagerRouter() {
  return createRouterFromOperations(createManagerOperationDefinitions());
}
