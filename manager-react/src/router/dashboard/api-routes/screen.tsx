'use client'

import UnauthorizedMessage from '@/components/unauthorized'
import { useSession } from '@/state/session'

import ApiTest from './ApiTest'

export function ManagerApiRoutesScreen() {
  const { hasPermissions } = useSession()

  if (!hasPermissions(['manager.apiOperations.readAny'])) {
    return (
      <UnauthorizedMessage neededPermission={['manager.apiOperations.readAny']} />
    )
  }

  return <ApiTest />
}
