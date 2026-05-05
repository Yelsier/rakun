import {
  createWebOperationDefinitions,
} from "@rakun/core";

import { createRouterFromOperations } from "../router";

export function createWebRouter() {
  return createRouterFromOperations(createWebOperationDefinitions());
}
