'use client'

import type { Permission } from '@rakun-kit/core/client'

import MediaLibrary from '@/components/media/MediaLibrary'
import { ManagerMediaProvider } from '@/media'
import UnauthorizedMessage from '@/components/unauthorized'
import { useSession } from '@/state/session'

const neededPermissions: Permission[] = [
  'content.Media.readAny',
  'content.Media.own',
]

export function ManagerMediaLibraryScreen() {
  const { hasAnyPermission } = useSession()

  if (!hasAnyPermission(neededPermissions)) {
    return (
      <UnauthorizedMessage anyPermission neededPermission={neededPermissions} />
    )
  }

  return (
    <ManagerMediaProvider renderPicker={() => null}>
      <div className="flex min-h-0 flex-col max-lg:h-auto lg:h-full">
        <MediaLibrary className="min-h-0 max-lg:flex-none lg:flex-1" />
      </div>
    </ManagerMediaProvider>
  )
}
