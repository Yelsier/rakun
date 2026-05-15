import type { ZodType } from "zod";

import type { RakunRequestContext } from "../context";
import { Logger } from "../../lib/Logger";

export type RakunOperationAccess = "public" | "auth";
export type RakunOperationKind = "query" | "mutation";
export type RakunOperationHttpMethod = "get" | "post";

export type RakunOperationSuccessArgs<TOutput> = {
  ctx: RakunRequestContext;
  result: TOutput;
};

type RakunOperationBase<
  TOutput = unknown,
  TKind extends RakunOperationKind = RakunOperationKind,
  TMethod extends RakunOperationHttpMethod = RakunOperationHttpMethod,
  TAccess extends RakunOperationAccess = RakunOperationAccess,
> = {
  access: TAccess;
  kind: TKind;
  method: TMethod;
  description?: string;
  output: ZodType<TOutput>;
  onSuccess?: (
    args: RakunOperationSuccessArgs<TOutput>,
  ) => Promise<void> | void;
};

type RakunOperationContractBase<
  TOutput = unknown,
  TKind extends RakunOperationKind = RakunOperationKind,
  TMethod extends RakunOperationHttpMethod = RakunOperationHttpMethod,
  TAccess extends RakunOperationAccess = RakunOperationAccess,
> = {
  access: TAccess;
  kind: TKind;
  method: TMethod;
  description?: string;
  output: ZodType<TOutput>;
};

export type RakunOperationContractWithoutInput<
  TOutput = unknown,
  TKind extends RakunOperationKind = RakunOperationKind,
  TMethod extends RakunOperationHttpMethod = RakunOperationHttpMethod,
  TAccess extends RakunOperationAccess = RakunOperationAccess,
> = RakunOperationContractBase<TOutput, TKind, TMethod, TAccess> & {
  input?: undefined;
};

export type RakunOperationContractWithInput<
  TInput,
  TOutput = unknown,
  TKind extends RakunOperationKind = RakunOperationKind,
  TMethod extends RakunOperationHttpMethod = RakunOperationHttpMethod,
  TAccess extends RakunOperationAccess = RakunOperationAccess,
> = RakunOperationContractBase<TOutput, TKind, TMethod, TAccess> & {
  input: ZodType<TInput>;
};

export type RakunOperationWithoutInput<
  TOutput = unknown,
  TKind extends RakunOperationKind = RakunOperationKind,
  TMethod extends RakunOperationHttpMethod = RakunOperationHttpMethod,
  TAccess extends RakunOperationAccess = RakunOperationAccess,
> = RakunOperationBase<TOutput, TKind, TMethod, TAccess> & {
  input?: undefined;
  resolve: (args: {
    ctx: RakunRequestContext;
    input: undefined;
  }) => Promise<TOutput> | TOutput;
};

export type RakunOperationWithInput<
  TInput,
  TOutput = unknown,
  TKind extends RakunOperationKind = RakunOperationKind,
  TMethod extends RakunOperationHttpMethod = RakunOperationHttpMethod,
  TAccess extends RakunOperationAccess = RakunOperationAccess,
> = RakunOperationBase<TOutput, TKind, TMethod, TAccess> & {
  input: ZodType<TInput>;
  resolve: (args: {
    ctx: RakunRequestContext;
    input: TInput;
  }) => Promise<TOutput> | TOutput;
};

export type RakunOperationDefinition<
  TInput = undefined,
  TOutput = unknown,
  TKind extends RakunOperationKind = RakunOperationKind,
  TMethod extends RakunOperationHttpMethod = RakunOperationHttpMethod,
  TAccess extends RakunOperationAccess = RakunOperationAccess,
> = [TInput] extends [undefined]
  ? RakunOperationWithoutInput<TOutput, TKind, TMethod, TAccess>
  : RakunOperationWithInput<TInput, TOutput, TKind, TMethod, TAccess>;

export type RakunOperationContractDefinition<
  TInput = undefined,
  TOutput = unknown,
  TKind extends RakunOperationKind = RakunOperationKind,
  TMethod extends RakunOperationHttpMethod = RakunOperationHttpMethod,
  TAccess extends RakunOperationAccess = RakunOperationAccess,
> = [TInput] extends [undefined]
  ? RakunOperationContractWithoutInput<TOutput, TKind, TMethod, TAccess>
  : RakunOperationContractWithInput<TInput, TOutput, TKind, TMethod, TAccess>;

export type AnyRakunOperation =
  | RakunOperationWithoutInput<any, any, any, any>
  | RakunOperationWithInput<any, any, any, any, any>;

export type AnyRakunOperationContract =
  | RakunOperationContractWithoutInput<any, any, any, any>
  | RakunOperationContractWithInput<any, any, any, any, any>;

export type RakunOperationMap = Record<
  string,
  AnyRakunOperation
>;

export type RakunOperationContractMap = Record<
  string,
  AnyRakunOperationContract
>;

type OperationContractInput<TContract extends AnyRakunOperationContract> =
  TContract extends {
    input: ZodType<infer TInput>;
  }
    ? TInput
    : undefined;

type OperationContractOutput<TContract extends AnyRakunOperationContract> =
  TContract extends {
    output: ZodType<infer TOutput>;
  }
    ? TOutput
    : never;

type OperationContractKind<TContract extends AnyRakunOperationContract> =
  TContract extends {
    kind: infer TKind;
  }
    ? TKind & RakunOperationKind
    : never;

type OperationContractMethod<TContract extends AnyRakunOperationContract> =
  TContract extends {
    method: infer TMethod;
  }
    ? TMethod & RakunOperationHttpMethod
    : never;

type OperationContractAccess<TContract extends AnyRakunOperationContract> =
  TContract extends {
    access: infer TAccess;
  }
    ? TAccess & RakunOperationAccess
    : never;

export type RakunOperationImplementationFromContract<
  TContract extends AnyRakunOperationContract,
> = [OperationContractInput<TContract>] extends [undefined]
  ? {
      resolve: (args: {
        ctx: RakunRequestContext;
        input: undefined;
      }) =>
        | Promise<OperationContractOutput<TContract>>
        | OperationContractOutput<TContract>;
      onSuccess?: (
        args: RakunOperationSuccessArgs<OperationContractOutput<TContract>>,
      ) => Promise<void> | void;
    }
  : {
      resolve: (args: {
        ctx: RakunRequestContext;
        input: OperationContractInput<TContract>;
      }) =>
        | Promise<OperationContractOutput<TContract>>
        | OperationContractOutput<TContract>;
      onSuccess?: (
        args: RakunOperationSuccessArgs<OperationContractOutput<TContract>>,
      ) => Promise<void> | void;
    };

export type RakunOperationImplementationMap<
  TContracts extends RakunOperationContractMap,
> = {
  [TName in keyof TContracts]: RakunOperationImplementationFromContract<
    TContracts[TName]
  >;
};

export type RakunOperationDefinitionFromContract<
  TContract extends AnyRakunOperationContract,
> = RakunOperationDefinition<
  OperationContractInput<TContract>,
  OperationContractOutput<TContract>,
  OperationContractKind<TContract>,
  OperationContractMethod<TContract>,
  OperationContractAccess<TContract>
>;

export type RakunOperationMeta<
  TKind extends RakunOperationKind = RakunOperationKind,
  TMethod extends RakunOperationHttpMethod = RakunOperationHttpMethod,
> = {
  kind: TKind;
  method: TMethod;
  path: string;
};

export type RakunOperationManifestFromContracts<
  TContracts extends RakunOperationContractMap,
> = {
  [TName in keyof TContracts & string]: RakunOperationMeta<
    OperationContractKind<TContracts[TName]>,
    OperationContractMethod<TContracts[TName]>
  >;
};

export function defineOperation<
  TOutput = unknown,
  TKind extends RakunOperationKind = RakunOperationKind,
  TMethod extends RakunOperationHttpMethod = RakunOperationHttpMethod,
  TAccess extends RakunOperationAccess = RakunOperationAccess,
>(
  operation: RakunOperationWithoutInput<TOutput, TKind, TMethod, TAccess>,
): RakunOperationWithoutInput<TOutput, TKind, TMethod, TAccess>;

export function defineOperation<
  TInput,
  TOutput = unknown,
  TKind extends RakunOperationKind = RakunOperationKind,
  TMethod extends RakunOperationHttpMethod = RakunOperationHttpMethod,
  TAccess extends RakunOperationAccess = RakunOperationAccess,
>(
  operation: RakunOperationWithInput<
    TInput,
    TOutput,
    TKind,
    TMethod,
    TAccess
  >,
): RakunOperationWithInput<TInput, TOutput, TKind, TMethod, TAccess>;

export function defineOperation(
  operation:
    | RakunOperationWithoutInput<any, any, any, any>
    | RakunOperationWithInput<any, any, any, any, any>,
) {
  return operation;
}

export function defineOperationContract<
  TOutput = unknown,
  TKind extends RakunOperationKind = RakunOperationKind,
  TMethod extends RakunOperationHttpMethod = RakunOperationHttpMethod,
  TAccess extends RakunOperationAccess = RakunOperationAccess,
>(
  operation: RakunOperationContractWithoutInput<TOutput, TKind, TMethod, TAccess>,
): RakunOperationContractWithoutInput<TOutput, TKind, TMethod, TAccess>;

export function defineOperationContract<
  TInput,
  TOutput = unknown,
  TKind extends RakunOperationKind = RakunOperationKind,
  TMethod extends RakunOperationHttpMethod = RakunOperationHttpMethod,
  TAccess extends RakunOperationAccess = RakunOperationAccess,
>(
  operation: RakunOperationContractWithInput<
    TInput,
    TOutput,
    TKind,
    TMethod,
    TAccess
  >,
): RakunOperationContractWithInput<TInput, TOutput, TKind, TMethod, TAccess>;

export function defineOperationContract(
  operation:
    | RakunOperationContractWithoutInput<any, any, any, any>
    | RakunOperationContractWithInput<any, any, any, any, any>,
) {
  return operation;
}

export const mergeOperationContracts = <
  TContracts extends RakunOperationContractMap,
>(
  contracts: TContracts,
  implementations: RakunOperationImplementationMap<TContracts>,
) => {
  const definitions = {} as {
    [TName in keyof TContracts]: RakunOperationDefinitionFromContract<
      TContracts[TName]
    >;
  };

  for (const name of Object.keys(contracts) as Array<keyof TContracts>) {
    const implementation = implementations[name];

    definitions[name] = {
      ...contracts[name],
      ...implementation,
      resolve: async (args: { ctx: RakunRequestContext; input: unknown }) => {
        addOperationStartTrace(String(name), args.input);
        const result = await implementation.resolve(args as never);
        addOperationSuccessTrace(String(name), result);
        return result;
      },
    } as unknown as RakunOperationDefinitionFromContract<TContracts[typeof name]>;
  }

  return definitions;
};

const REDACTED_TRACE_VALUE = "[redacted]";
const CIRCULAR_TRACE_VALUE = "[circular]";
const MAX_TRACE_INPUT_DEPTH = 6;
const MAX_TRACE_ARRAY_ITEMS = 25;
const MAX_TRACE_STRING_LENGTH = 500;

const sensitiveTraceKeyPattern =
  /(authorization|challenge|cookie|credential|password|secret|session|token|totp|webauthn)/i;

const sanitizeTraceValue = (
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return value.length > MAX_TRACE_STRING_LENGTH
      ? `${value.slice(0, MAX_TRACE_STRING_LENGTH)}...`
      : value;
  }

  if (typeof value !== "object") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return "[binary]";
  }

  if (seen.has(value)) {
    return CIRCULAR_TRACE_VALUE;
  }

  if (depth >= MAX_TRACE_INPUT_DEPTH) {
    return "[max-depth]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_TRACE_ARRAY_ITEMS)
      .map((item) => sanitizeTraceValue(item, depth + 1, seen));

    if (value.length > MAX_TRACE_ARRAY_ITEMS) {
      items.push(`[truncated:${value.length - MAX_TRACE_ARRAY_ITEMS}]`);
    }

    return items;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sensitiveTraceKeyPattern.test(key)
        ? REDACTED_TRACE_VALUE
        : sanitizeTraceValue(item, depth + 1, seen),
    ]),
  );
};

const addOperationStartTrace = (name: string, input: unknown) => {
  Logger.addTrace(
    `${name}: handler start`,
    input === undefined ? undefined : { input: sanitizeTraceValue(input) },
  );
};

const addOperationSuccessTrace = (name: string, result: unknown) => {
  Logger.addTrace(
    `${name}: handler success`,
    result === undefined ? undefined : { result: sanitizeTraceValue(result) },
  );
};

export const createOperationPath = (name: string) =>
  `/${name.split(".").join("/")}`;

export const createOperationManifest = <
  TContracts extends RakunOperationContractMap,
>(
  contracts: TContracts,
): RakunOperationManifestFromContracts<TContracts> => {
  const manifest = {} as RakunOperationManifestFromContracts<TContracts>;

  for (const name of Object.keys(contracts) as Array<keyof TContracts & string>) {
    manifest[name] = {
      kind: contracts[name].kind,
      method: contracts[name].method,
      path: createOperationPath(name),
    } as RakunOperationManifestFromContracts<TContracts>[typeof name];
  }

  return manifest;
};
