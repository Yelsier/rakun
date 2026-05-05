'use client'

import type { QueryKey, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query'

import {
  createManagerQueryKey,
  createManagerQueryOptions,
  useManagerClient,
} from '@/client/react'

const createCompatQueryOptions = (
  client: ReturnType<typeof useManagerClient>,
  name: string,
  input: unknown,
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>,
): any => ({
  ...options,
  ...createManagerQueryOptions(client, name as never, input as never),
})

const createCompatMutationOptions = (
  client: ReturnType<typeof useManagerClient>,
  name: string,
  options?: UseMutationOptions,
): any => ({
  mutationKey: (options?.mutationKey ?? [name]) as QueryKey,
  ...options,
  mutationFn: async (input: unknown) => await client.request(name as never, input as never),
})

export const useTRPC: () => {
  manager: {
    list: { queryOptions: (input: unknown, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => ReturnType<typeof createCompatQueryOptions> }
    get: { queryOptions: (input: unknown, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => ReturnType<typeof createCompatQueryOptions> }
    contentTypes: { queryOptions: (input?: undefined, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => ReturnType<typeof createCompatQueryOptions> }
    permissions: { queryOptions: (input?: undefined, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => ReturnType<typeof createCompatQueryOptions> }
    create: { mutationOptions: (options?: UseMutationOptions) => ReturnType<typeof createCompatMutationOptions> }
    update: { mutationOptions: (options?: UseMutationOptions) => ReturnType<typeof createCompatMutationOptions> }
    delete: { mutationOptions: (options?: UseMutationOptions) => ReturnType<typeof createCompatMutationOptions> }
    media: {
      getUrl: { queryOptions: (input: unknown, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) => ReturnType<typeof createCompatQueryOptions> }
    }
  }
} = () => {
  const client = useManagerClient()

  return {
    manager: {
      list: {
        queryOptions: (input: unknown, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) =>
          createCompatQueryOptions(client, 'manager.list', input, options),
      },
      get: {
        queryOptions: (input: unknown, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) =>
          createCompatQueryOptions(client, 'manager.get', input, options),
      },
      contentTypes: {
        queryOptions: (input?: undefined, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) =>
          createCompatQueryOptions(client, 'manager.contentTypes', input, options),
      },
      permissions: {
        queryOptions: (input?: undefined, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) =>
          createCompatQueryOptions(client, 'manager.permissions', input, options),
      },
      create: {
        mutationOptions: (options?: UseMutationOptions) =>
          createCompatMutationOptions(client, 'manager.create', options),
      },
      update: {
        mutationOptions: (options?: UseMutationOptions) =>
          createCompatMutationOptions(client, 'manager.update', options),
      },
      delete: {
        mutationOptions: (options?: UseMutationOptions) =>
          createCompatMutationOptions(client, 'manager.delete', options),
      },
      media: {
        getUrl: {
          queryOptions: (input: unknown, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) =>
            createCompatQueryOptions(client, 'manager.media.getUrl', input, options),
        },
      },
    },
  }
}

export const useTRPCClient: () => {
  manager: {
    media: { getUrl: { query: (input: unknown) => Promise<unknown> } }
    get: { query: (input: unknown) => Promise<unknown> }
    list: { query: (input: unknown) => Promise<unknown> }
    contentTypes: { query: () => Promise<unknown> }
  }
} = () => {
  const client = useManagerClient()

  return {
    manager: {
      media: {
        getUrl: {
          query: async (input: unknown) =>
            await client.request('manager.media.getUrl' as never, input as never),
        },
      },
      get: {
        query: async (input: unknown) =>
          await client.request('manager.get' as never, input as never),
      },
      list: {
        query: async (input: unknown) =>
          await client.request('manager.list' as never, input as never),
      },
      contentTypes: {
        query: async () =>
          await client.request('manager.contentTypes' as never, undefined as never),
      },
    },
  }
}

export const getManagerQueryKey = createManagerQueryKey
