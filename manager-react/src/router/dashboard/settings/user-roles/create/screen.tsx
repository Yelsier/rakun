'use client'

import { EditRole } from '../edit'

import UnauthorizedMessage from '@/components/unauthorized'
import { useSession } from '@/state/session'

export const ManagerSettingsUserRoleCreateScreen = () => {
  const { hasPermissions } = useSession()

  if (!hasPermissions(['content.ManagerRole.updateAny'])) {
    return (
      <UnauthorizedMessage neededPermission={['content.ManagerRole.updateAny']} />
    )
  }

  return <EditRole />
}
