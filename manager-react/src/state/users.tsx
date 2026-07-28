'use client'

import type { MentionUser } from '@rakun-kit/core/client'
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'

import { useManagerQuery } from '@/client/react'

type ManagerUsersContextValue = {
  users: MentionUser[]
  usersById: ReadonlyMap<string, MentionUser>
  isLoading: boolean
  isError: boolean
  refetch: () => Promise<void>
}

const ManagerUsersContext = createContext<ManagerUsersContextValue | null>(null)

export function ManagerUsersProvider({ children }: { children: ReactNode }) {
  const usersQuery = useManagerQuery({
    name: 'manager.users.mentions',
    input: undefined,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })
  const users = usersQuery.data ?? []
  const usersById = useMemo(
    () => new Map(users.map((user) => [user._id, user])),
    [users]
  )
  const value = useMemo<ManagerUsersContextValue>(
    () => ({
      users,
      usersById,
      isLoading: usersQuery.isLoading,
      isError: usersQuery.isError,
      refetch: async () => {
        await usersQuery.refetch()
      },
    }),
    [
      users,
      usersById,
      usersQuery.isError,
      usersQuery.isLoading,
      usersQuery.refetch,
    ]
  )

  return (
    <ManagerUsersContext.Provider value={value}>
      {children}
    </ManagerUsersContext.Provider>
  )
}

export function useManagerUsers() {
  const context = useContext(ManagerUsersContext)

  if (!context) {
    throw new Error(
      'useManagerUsers must be used within <ManagerUsersProvider>.'
    )
  }

  return context
}
