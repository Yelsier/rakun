import {
  type DefaultError,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
  useMutation,
  useQuery,
} from '@tanstack/react-query'
import { createContext, useContext, type ReactNode } from 'react'

import type {
  ManagerMutationOperationName,
  ManagerOperationInput,
  ManagerOperationOutput,
  ManagerQueryOperationName,
} from './operations'
import type { ManagerClient } from './request'

const MANAGER_QUERY_PREFIX = 'rakun-manager'

const ManagerClientContext = createContext<ManagerClient | null>(null)

export type ManagerProviderProps = {
  client: ManagerClient
  children: ReactNode
}

export const ManagerProvider = ({
  client,
  children,
}: ManagerProviderProps) => {
  return (
    <ManagerClientContext.Provider value={client}>
      {children}
    </ManagerClientContext.Provider>
  )
}

export const useManagerClient = () => {
  const client = useContext(ManagerClientContext)

  if (!client) {
    throw new Error('useManagerClient must be used inside <ManagerProvider>.')
  }

  return client
}

export type ManagerQueryKey<TName extends ManagerQueryOperationName> = readonly [
  typeof MANAGER_QUERY_PREFIX,
  TName,
  ManagerOperationInput<TName> | null,
]

export type ManagerQueryOptionsResult<TName extends ManagerQueryOperationName> =
  {
    queryKey: ManagerQueryKey<TName>
    queryFn: (context: {
      signal: AbortSignal
    }) => Promise<ManagerOperationOutput<TName>>
  }

export const createManagerQueryKey = <TName extends ManagerQueryOperationName>(
  name: TName,
  input: ManagerOperationInput<TName>,
): ManagerQueryKey<TName> =>
  [MANAGER_QUERY_PREFIX, name, (input ?? null) as never] as const

export const createManagerQueryOptions = <
  TName extends ManagerQueryOperationName,
>(
  client: ManagerClient,
  name: TName,
  input: ManagerOperationInput<TName>,
): ManagerQueryOptionsResult<TName> => ({
  queryKey: createManagerQueryKey(name, input),
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    client.request(name, input as never, { signal }),
})

export type UseManagerQueryArgs<TName extends ManagerQueryOperationName> =
  Omit<
    UseQueryOptions<
      ManagerOperationOutput<TName>,
      DefaultError,
      ManagerOperationOutput<TName>,
      ManagerQueryKey<TName>
    >,
    'queryKey' | 'queryFn'
  > & {
    name: TName
    input: ManagerOperationInput<TName>
  }

export const useManagerQuery = <TName extends ManagerQueryOperationName>({
  name,
  input,
  ...options
}: UseManagerQueryArgs<TName>): UseQueryResult<
  ManagerOperationOutput<TName>,
  DefaultError
> => {
  const client = useManagerClient()

  return useQuery({
    ...options,
    ...createManagerQueryOptions(client, name, input),
  })
}

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
  'mutationFn'
> & {
  mutationKey?: QueryKey
}

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
  const client = useManagerClient()

  return useMutation({
    mutationKey: options.mutationKey ?? [MANAGER_QUERY_PREFIX, name],
    ...options,
    mutationFn: async (input: ManagerOperationInput<TName>) =>
      await client.request(name, input as never),
  })
}
