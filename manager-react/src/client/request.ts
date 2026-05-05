import type {
  ManagerOperationInput,
  ManagerOperationName,
  ManagerOperationOutput,
} from "./operations";

export type ManagerRequestOptions = {
  signal?: AbortSignal;
  headers?: HeadersInit;
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

export type ManagerClient = {
  request: ManagerRequestFn;
};

export const createManagerClient = (
  request: ManagerRequestFn,
): ManagerClient => ({
  request,
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
