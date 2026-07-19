'use client'

import { isAdminRole } from '@rakun-kit/core/client'

import { EditRole } from '../edit'
import type { ManagerRoleRecord } from '../columns'

import { useManagerQuery } from '@/client/react'
import ErrorMessage from '@/components/error'
import Loading from '@/components/loading'
import UnauthorizedMessage from '@/components/unauthorized'
import { useSession } from '@/state/session'

export const ManagerSettingsUserRoleEditScreen = ({ id }: { id: string }) => {
  const { hasPermissions } = useSession()
  const roleQuery = useManagerQuery({
    name: 'manager.get',
    input: {
      contentType: 'ManagerRole',
      id,
    },
  })

  if (!hasPermissions(['content.ManagerRole.updateAny'])) {
    return (
      <UnauthorizedMessage neededPermission={['content.ManagerRole.updateAny']} />
    )
  }

  if (roleQuery.isLoading) {
    return <Loading />
  }

  if (!roleQuery.data) {
    return (
      <ErrorMessage
        message='Content type "ManagerRole" not found.'
        _tag='NotFound'
      />
    )
  }

  if (isAdminRole(roleQuery.data as ManagerRoleRecord)) {
    return (
      <ErrorMessage
        message='The admin role is managed by Rakun and cannot be modified.'
        _tag='Forbidden'
      />
    )
  }

  return <EditRole defaultValues={roleQuery.data as ManagerRoleRecord} />
}
