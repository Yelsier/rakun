'use client'

import type { EncodedContentType, Permission } from '@rakun-kit/core/client'

import EditPage from './edit'
import type { FieldValue } from './_fields/shared'

import { useManagerQuery } from '@/client/react'
import ErrorMessage from '@/components/error'
import Loading from '@/components/loading'
import UnauthorizedMessage from '@/components/unauthorized'
import { useSession } from '@/state/session'
import type { ManagerPreviewConfig } from '@/router/shared/types'

export const ManagerContentTypeEditScreen = ({
  contentType,
  id,
  preview,
}: {
  contentType?: EncodedContentType
  id: string
  preview?: ManagerPreviewConfig
}) => {
  const { user, hasAnyPermission, hasPermissions } = useSession()
  const itemQuery = useManagerQuery({
    name: 'manager.get',
    input: contentType
      ? {
          contentType: contentType.name,
          id,
        }
      : ({
          contentType: '',
          id,
        } as never),
    enabled: !!contentType,
  })

  if (!contentType) {
    return (
      <ErrorMessage
        message='Content type not found.'
        _tag='NotFound'
      />
    )
  }

  const neededPermissions: Permission[] = [
    `content.${contentType.name}.own` as Permission,
    `content.${contentType.name}.updateAny` as Permission,
  ]

  if (!hasAnyPermission(neededPermissions)) {
    return (
      <UnauthorizedMessage neededPermission={neededPermissions} anyPermission />
    )
  }

  if (itemQuery.isLoading || !itemQuery.data) {
    return <Loading />
  }

  const defaultData = itemQuery.data as Record<string, FieldValue> & {
    createdBy?: string
  }

  if (
    defaultData.createdBy !== user?._id &&
    !hasPermissions([`content.${contentType.name}.updateAny` as Permission])
  ) {
    return (
      <UnauthorizedMessage
        message='You are not the owner of this content and you do not have permissions to edit any content of this type.'
        neededPermission={[`content.${contentType.name}.updateAny` as Permission]}
      />
    )
  }

  return (
    <EditPage
      defaultData={defaultData}
      contentType={contentType}
      preview={preview}
      onAfterRestore={() => itemQuery.refetch()}
    />
  )
}
