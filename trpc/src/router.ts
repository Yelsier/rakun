/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  TRPCError,
  type TRPCCreateRouterOptions,
  type TRPCMutationProcedure,
  type TRPCQueryProcedure,
  initTRPC,
} from "@trpc/server";
import {
  type AnyRakunOperation,
  createManagerOperationDefinitions,
  createWebOperationDefinitions,
  type RakunOperationDefinition,
  type RakunRequestContext,
} from "@rakun/core";
import {
  ErrorCatalog,
  getAppErrorShape,
  throwAppError,
} from "@rakun/core/errors";
import superjson from "superjson";
import { z, ZodError } from "zod";

export type Meta = {
  description?: string;
};

export type TrpcContext = RakunRequestContext;

const errorKeys = Object.keys(ErrorCatalog) as [
  keyof typeof ErrorCatalog & string,
  ...(keyof typeof ErrorCatalog & string)[],
];

const AppErrorZ = z.object({
  key: z.enum(errorKeys),
  cause: z.any(),
});

const t = initTRPC
  .context<TrpcContext>()
  .meta<Meta>()
  .create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
      if (error.cause instanceof ZodError) {
        console.log(z.prettifyError(error.cause));
      }

      const appError = AppErrorZ.safeParse(getAppErrorShape(error.cause));

      return {
        ...shape,
        data: {
          ...shape.data,
          appError: appError.success ? appError.data : null,
        },
      };
    },
  });

const appErrorMiddleware = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    const appError = getAppErrorShape(error);

    if (!appError) {
      throw error;
    }

    throw new TRPCError({
      code: ErrorCatalog[appError.key as keyof typeof ErrorCatalog].trpcCode,
      message: appError.key,
      cause: appError,
    });
  }
});

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throwAppError("AUTH_REQUIRED");
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const publicProcedure = t.procedure.use(appErrorMiddleware);
export const authProcedure = publicProcedure.use(isAuthed);
export const router = t.router;
export const mergeRouters = t.mergeRouters;

type OperationInput<TOperation extends AnyRakunOperation> =
  TOperation extends RakunOperationDefinition<infer TInput, any, any, any, any>
    ? undefined extends TInput
      ? void | TInput
      : TInput
    : never;

type OperationOutput<TOperation extends AnyRakunOperation> =
  TOperation extends RakunOperationDefinition<any, infer TOutput, any, any, any>
    ? TOutput
    : never;

type ProcedureFromOperation<
  TOperation extends AnyRakunOperation,
> = TOperation["kind"] extends "query"
  ? TRPCQueryProcedure<{
      input: OperationInput<TOperation>;
      output: OperationOutput<TOperation>;
      meta: Meta;
    }>
  : TRPCMutationProcedure<{
      input: OperationInput<TOperation>;
      output: OperationOutput<TOperation>;
      meta: Meta;
    }>;

type UnionToIntersection<TUnion> = (
  TUnion extends unknown ? (value: TUnion) => void : never
) extends (value: infer TIntersection) => void
  ? TIntersection
  : never;

type Expand<TValue> = TValue extends (...args: any[]) => any
  ? TValue
  : TValue extends object
  ? { [TKey in keyof TValue]: Expand<TValue[TKey]> }
  : TValue;

type NestPath<TPath extends string, TValue> =
  TPath extends `${infer THead}.${infer TTail}`
    ? { [TKey in THead]: NestPath<TTail, TValue> }
    : { [TKey in TPath]: TValue };

type RouterRecordFromOperations<
  TOperations extends Record<string, AnyRakunOperation>,
> = Expand<
  UnionToIntersection<
    {
      [TPath in keyof TOperations & string]: NestPath<
        TPath,
        ProcedureFromOperation<TOperations[TPath]>
      >;
    }[keyof TOperations & string]
  >
> extends infer TRecord
  ? TRecord extends TRPCCreateRouterOptions
    ? TRecord
    : never
  : never;

const setNestedValue = (
  target: Record<string, any>,
  path: string[],
  value: unknown,
) => {
  const [head, ...rest] = path;

  if (!head) {
    return;
  }

  if (rest.length === 0) {
    target[head] = value;
    return;
  }

  if (!(head in target)) {
    target[head] = {};
  }

  setNestedValue(target[head] as Record<string, any>, rest, value);
};

const createProcedureFromOperation = <
  TOperation extends AnyRakunOperation,
>(
  operation: TOperation,
): ProcedureFromOperation<TOperation> => {
  let procedure: any =
    operation.access === "auth" ? authProcedure : publicProcedure;

  procedure = procedure.meta({
    description: operation.description,
  });

  if (operation.input) {
    procedure = procedure.input(operation.input as any);
  }

  procedure = procedure.output(operation.output as any);

  const execute = async ({ ctx, input }: { ctx: TrpcContext; input: any }) => {
    const result = await operation.resolve({
      ctx,
      input,
    });

    await operation.onSuccess?.({
      ctx,
      result,
    });

    return result;
  };

  return (operation.kind === "query"
    ? procedure.query(execute)
    : procedure.mutation(execute)) as ProcedureFromOperation<TOperation>;
};

export const createRouterFromOperations = <
  TOperations extends Record<string, AnyRakunOperation>,
>(
  operations: TOperations,
) => {
  const tree: Record<string, any> = {};

  for (const [name, operation] of Object.entries(operations)) {
    setNestedValue(
      tree,
      name.split("."),
      createProcedureFromOperation(operation),
    );
  }

  return router(tree as RouterRecordFromOperations<TOperations>);
};

export const routerInfo = createRouterFromOperations({
  ...createManagerOperationDefinitions(),
  ...createWebOperationDefinitions(),
});
