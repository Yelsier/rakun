import {
  type DefaultError,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import type { RealtimeMetadata } from "@rakun-kit/core/client";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import type {
  ManagerMutationOperationName,
  ManagerOperationInput,
  ManagerOperationOutput,
  ManagerQueryOperationName,
} from "./operations";
import type { ManagerClient } from "./request";
import {
  pollingRealtime,
  realtimeFromMetadata,
  type RealtimeProvider,
  useRealtimeSync,
  type UseRealtimeSyncArgs,
} from "./realtime";

const MANAGER_QUERY_PREFIX = "rakun-manager";

const ManagerClientContext = createContext<ManagerClient | null>(null);
const ManagerRealtimeContext = createContext<RealtimeProvider | null>(null);

export type ManagerProviderProps = {
  client: ManagerClient;
  realtime?: RealtimeProvider | RealtimeMetadata;
  children: ReactNode;
};

export const ManagerProvider = ({
  client,
  realtime,
  children,
}: ManagerProviderProps) => {
  const resolvedRealtime = useMemo(() => {
    if (!realtime) return pollingRealtime();
    return "subscribe" in realtime ? realtime : realtimeFromMetadata(realtime);
  }, [realtime]);

  return (
    <ManagerClientContext.Provider value={client}>
      <ManagerRealtimeContext.Provider value={resolvedRealtime}>
        {children}
      </ManagerRealtimeContext.Provider>
    </ManagerClientContext.Provider>
  );
};

export const useManagerClient = () => {
  const client = useContext(ManagerClientContext);

  if (!client) {
    throw new Error("useManagerClient must be used inside <ManagerProvider>.");
  }

  return client;
};

export const useManagerRealtime = (): RealtimeProvider => {
  const realtime = useContext(ManagerRealtimeContext);

  if (!realtime) {
    throw new Error("useManagerRealtime must be used inside <ManagerProvider>.");
  }

  return realtime;
};

export type UseSyncArgs<
  TData,
  TError = DefaultError,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<UseRealtimeSyncArgs<TData, TError, TQueryKey>, "realtime">;

export const useSync = <
  TData,
  TError = DefaultError,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseSyncArgs<TData, TError, TQueryKey>,
): UseQueryResult<TData, TError> => {
  const realtime = useManagerRealtime();
  return useRealtimeSync({ ...options, realtime });
};

export type ManagerQueryKey<TName extends ManagerQueryOperationName> =
  readonly [
    typeof MANAGER_QUERY_PREFIX,
    TName,
    ManagerOperationInput<TName> | null,
  ];

export type ManagerQueryOptionsResult<TName extends ManagerQueryOperationName> =
  {
    queryKey: ManagerQueryKey<TName>;
    queryFn: (context: {
      signal: AbortSignal;
    }) => Promise<ManagerOperationOutput<TName>>;
  };

export type ManagerQueryOptionsConfig = {
  consumeSignal?: boolean;
};

export const createManagerQueryKey = <TName extends ManagerQueryOperationName>(
  name: TName,
  input: ManagerOperationInput<TName>,
): ManagerQueryKey<TName> =>
  [MANAGER_QUERY_PREFIX, name, input ?? null] as const;

export const createManagerQueryOptions = <
  TName extends ManagerQueryOperationName,
>(
  client: ManagerClient,
  name: TName,
  input: ManagerOperationInput<TName>,
  config: ManagerQueryOptionsConfig = {},
): ManagerQueryOptionsResult<TName> => ({
  queryKey: createManagerQueryKey(name, input),
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    client.request(name, input, {
      signal: config.consumeSignal ? signal : undefined,
    }),
});

export type UseManagerQueryArgs<TName extends ManagerQueryOperationName> = Omit<
  UseQueryOptions<
    ManagerOperationOutput<TName>,
    DefaultError,
    ManagerOperationOutput<TName>,
    ManagerQueryKey<TName>
  >,
  "queryKey" | "queryFn"
> & {
  name: TName;
  input: ManagerOperationInput<TName>;
  consumeSignal?: boolean;
};

export const useManagerQuery = <TName extends ManagerQueryOperationName>({
  name,
  input,
  consumeSignal = false,
  ...options
}: UseManagerQueryArgs<TName>): UseQueryResult<
  ManagerOperationOutput<TName>,
  DefaultError
> => {
  const client = useManagerClient();

  return useQuery({
    ...options,
    ...createManagerQueryOptions(client, name, input, { consumeSignal }),
  });
};

export type UseManagerSyncQueryArgs<
  TName extends ManagerQueryOperationName,
> = Omit<UseManagerQueryArgs<TName>, "refetchInterval"> & {
  topic?: string;
  syncEnabled?: boolean;
  syncIntervalMs?: number;
};

export const useManagerSyncQuery = <TName extends ManagerQueryOperationName>({
  name,
  input,
  consumeSignal = false,
  topic,
  syncEnabled,
  syncIntervalMs,
  ...options
}: UseManagerSyncQueryArgs<TName>): UseQueryResult<
  ManagerOperationOutput<TName>,
  DefaultError
> => {
  const client = useManagerClient();
  const query = createManagerQueryOptions(client, name, input, {
    consumeSignal,
  });

  return useSync({
    ...options,
    key: query.queryKey,
    fetcher: query.queryFn,
    topic,
    syncEnabled,
    syncIntervalMs,
  });
};

export type UseManagerMutationOptions<
  TName extends ManagerMutationOperationName,
  TContext = unknown,
> = Omit<
  UseMutationOptions<
    ManagerOperationOutput<TName>,
    DefaultError,
    ManagerOperationInput<TName>,
    TContext
  >,
  "mutationFn"
> & {
  mutationKey?: QueryKey;
};

export const useManagerMutation = <
  TName extends ManagerMutationOperationName,
  TContext = unknown,
>(
  name: TName,
  options: UseManagerMutationOptions<TName, TContext> = {},
): UseMutationResult<
  ManagerOperationOutput<TName>,
  DefaultError,
  ManagerOperationInput<TName>,
  TContext
> => {
  const client = useManagerClient();

  return useMutation({
    mutationKey: options.mutationKey ?? [MANAGER_QUERY_PREFIX, name],
    ...options,
    mutationFn: async (input: ManagerOperationInput<TName>) =>
      await client.request(name, input),
  });
};
