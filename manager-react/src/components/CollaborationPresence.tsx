'use client'

import { AvatarGroup, AvatarGroupCount } from './ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { UserAvatar } from './user-avatar'

import {
  getCollaborationPresenceRoomKey,
  useCollaborationPresenceSnapshot,
} from '@/collaboration/presence-store'
import { getCollaborationPresenceColor } from '@/collaboration/presence-colors'
import { translateFieldLabel, useTranslations } from '@/i18n'

const MAX_VISIBLE_AVATARS = 2

const getFieldLabel = (
  fieldId: string,
  t: ReturnType<typeof useTranslations>,
) => {
  const path = fieldId.split('.').filter(Boolean)
  const fieldKey = path[path.length - 1] ?? fieldId
  return translateFieldLabel(t, fieldKey)
}

export const CollaborationPresence = ({
  contentType,
  documentId,
}: {
  contentType: string
  documentId: string
}) => {
  const t = useTranslations()
  const roomKey = getCollaborationPresenceRoomKey(
    'content',
    contentType,
    documentId,
  )
  const { clientId, participants } = useCollaborationPresenceSnapshot(roomKey)

  if (!participants.length) return null

  const hiddenCount = Math.max(0, participants.length - MAX_VISIBLE_AVATARS)
  const visibleParticipants = participants.slice(0, MAX_VISIBLE_AVATARS)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          aria-label={t('contentEdit.presence.viewers', {
            count: participants.length,
          })}
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          role="group"
          tabIndex={0}
        >
          <AvatarGroup>
            {visibleParticipants.map((participant) => (
              <UserAvatar
                key={participant.clientId}
                avatar={participant.avatar}
                className="size-7"
                name={participant.name}
                email={participant.user}
              />
            ))}
            {hiddenCount ? (
              <AvatarGroupCount className="size-7 text-xs">
                {t('contentEdit.presence.more', { count: hiddenCount })}
              </AvatarGroupCount>
            ) : null}
          </AvatarGroup>
        </div>
      </TooltipTrigger>
      <TooltipContent
        align="end"
        className="w-72 overflow-hidden bg-popover p-0 text-popover-foreground shadow-md"
        side="bottom"
        sideOffset={8}
      >
        <p className="border-b px-3 py-2.5 text-sm font-medium">
          {t('contentEdit.presence.viewers', { count: participants.length })}
        </p>
        <div className="space-y-0.5 p-1.5">
          {participants.map((participant) => {
            const displayName = participant.name || participant.user
            return (
              <div
                key={participant.clientId}
                className="flex min-w-0 items-center gap-2 rounded-sm px-1.5 py-1.5"
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: getCollaborationPresenceColor(
                      participant.clientId,
                    ),
                  }}
                />
                <UserAvatar
                  avatar={participant.avatar}
                  className="size-7"
                  name={participant.name}
                  email={participant.user}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate text-sm font-medium">
                    {displayName}
                    {participant.clientId === clientId ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        {t('contentEdit.presence.thisTab')}
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {participant.fieldId
                      ? t('contentEdit.presence.editingField', {
                          field: getFieldLabel(participant.fieldId, t),
                        })
                      : t('contentEdit.presence.viewing')}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
