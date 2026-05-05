'use client'

import { EditRole } from '../edit'

import UnauthorizedMessage from '@/components/unauthorized'
import { useSession } from '@/state/session'

export const ManagerSettingsUserRoleCreateScreen = () => {
  const { hasPermissions } = useSession()

  if (!hasPermissions(['manager.roles.updateAny'])) {
    return (
      <UnauthorizedMessage neededPermission={['manager.roles.updateAny']} />
    )
  }

  return <EditRole />
}

