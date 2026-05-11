import type {
  ManagerOperationInput,
  ManagerOperationName,
  ManagerOperationOutput,
} from "./operations";

export type ManagerRequestOptions = {
  signal?: AbortSignal;
  headers?: HeadersInit;
};

export type ManagerGenericOperationMeta = {
  path: string;
  method: "get" | "post";
};

export type ManagerRequestArgs<TName extends ManagerOperationName> =
  undefined extends ManagerOperationInput<TName>
    ? [
        name: TName,
        input?: ManagerOperationInput<TName>,
        options?: ManagerRequestOptions,
      ]
    : [
        name: TName,
        input: ManagerOperationInput<TName>,
        options?: ManagerRequestOptions,
      ];

export type ManagerRequestFn = <TName extends ManagerOperationName>(
  ...args: ManagerRequestArgs<TName>
) => Promise<ManagerOperationOutput<TName>>;

export type ManagerGenericRequestFn = (
  name: string,
  input: unknown,
  meta: ManagerGenericOperationMeta,
  options?: ManagerRequestOptions,
) => Promise<unknown>;

export type ManagerClient = {
  request: ManagerRequestFn;
  requestOperation?: ManagerGenericRequestFn;
};

export const createManagerClient = (
  request: ManagerRequestFn,
  requestOperation?: ManagerGenericRequestFn,
): ManagerClient => ({
  request,
  requestOperation,
});

export const normalizeManagerRequestArgs = <TName extends ManagerOperationName>(
  args: ManagerRequestArgs<TName>,
) => {
  const [name, input, options] = args as [
    TName,
    ManagerOperationInput<TName> | undefined,
    ManagerRequestOptions | undefined,
  ];

  return {
    name,
    input,
    options,
  };
};
