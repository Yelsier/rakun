import {
  createWebOperationDefinitions,
} from "@rakun-kit/core";

import { createRouterFromOperations } from "../router";

export function createWebRouter() {
  return createRouterFromOperations(createWebOperationDefinitions());
}
