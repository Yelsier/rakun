'use client'

import type { EncodedContentType, Permission } from '@rakun-kit/core/client'

import EditPage from '../[edit]/edit'
import type { ManagerPreviewConfig } from '@/router/shared/types'

import UnauthorizedMessage from '@/components/unauthorized'
import { useSession } from '@/state/session'

export const ManagerContentTypeCreateScreen = ({
  contentType,
  preview,
}: {
  contentType?: EncodedContentType
  preview?: ManagerPreviewConfig
}) => {
  const { hasAnyPermission } = useSession()

  if (!contentType) {
    return <div>Content type not found.</div>
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

  return <EditPage contentType={contentType} preview={preview} />
}
