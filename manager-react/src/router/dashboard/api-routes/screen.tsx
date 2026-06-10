'use client'

import UnauthorizedMessage from '@/components/unauthorized'
import { useSession } from '@/state/session'

import ApiTest from './ApiTest'

export function ManagerApiRoutesScreen() {
  const { hasPermissions } = useSession()

  if (!hasPermissions(['content.ApiOperation.readAny'])) {
    return (
      <UnauthorizedMessage neededPermission={['content.ApiOperation.readAny']} />
    )
  }

  return <ApiTest />
}
