import {
  createManagerOperationDefinitions,
} from "@rakun-kit/core";

import { createRouterFromOperations } from "../router";

export function createManagerRouter() {
  return createRouterFromOperations(createManagerOperationDefinitions());
}
