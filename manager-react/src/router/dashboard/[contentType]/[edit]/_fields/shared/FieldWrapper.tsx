import React, { useEffect, useImperativeHandle, useRef } from 'react'
import type { CSSProperties } from 'react'

import type { FieldRef } from '../../ContentTypeEdit'
import { deepEqual } from '@/helpers/deepEqual'
import { useConditionFieldDispatch } from './condition-state'
import {
  useCollaborativeFieldBridge,
  useContentCollaboration,
} from '@/collaboration/ContentCollaborationProvider'
import { getCollaborationPresenceColor } from '@/collaboration/presence-colors'

interface FieldWrapperProps {
  id: string
  errors: { id: string; error: string }[]
  getValue: () => unknown
  getState: () => unknown
  children: React.ReactNode
  ref?: React.Ref<FieldRef>
}

export const FieldWrapper: React.FC<FieldWrapperProps> = ({
  id,
  errors,
  getValue,
  getState,
  children,
  ref,
}) => {
  const conditionFieldDispatch = useConditionFieldDispatch()
  const publishCollaborativeField = useCollaborativeFieldBridge()
  const collaboration = useContentCollaboration()
  const lastNotifiedStateRef = useRef<unknown>(undefined)
  const hasNotifiedRef = useRef(false)

  useImperativeHandle(
    ref,
    (): FieldRef => ({
      getValue,
      getState,
    }),
  )

  useEffect(() => {
    hasNotifiedRef.current = false
    lastNotifiedStateRef.current = undefined
  }, [id])

  useEffect(() => {
    if (!conditionFieldDispatch) return

    const nextState = getState()
    if (hasNotifiedRef.current && deepEqual(lastNotifiedStateRef.current, nextState)) {
      return
    }

    hasNotifiedRef.current = true
    lastNotifiedStateRef.current = nextState
    conditionFieldDispatch.onFieldStateChange(id, nextState)
    publishCollaborativeField(id, nextState)
  })

  const error = errors.find((e) => e.id === id)?.error
  const remoteParticipant = collaboration?.presence.find(
    (participant) =>
      participant.clientId !== collaboration.clientId && participant.fieldId === id,
  )
  const presenceStyle: (CSSProperties & {
    '--collaboration-presence-color': string
  }) | undefined = remoteParticipant
    ? {
        '--collaboration-presence-color': getCollaborationPresenceColor(
          remoteParticipant.clientId,
        ),
      }
    : undefined

  return (
    <div
      className="contents data-[remote-presence=true]:[&_input]:inset-ring-2 data-[remote-presence=true]:[&_input]:inset-ring-[var(--collaboration-presence-color)] data-[remote-presence=true]:[&_textarea]:inset-ring-2 data-[remote-presence=true]:[&_textarea]:inset-ring-[var(--collaboration-presence-color)] data-[remote-presence=true]:[&_[contenteditable=true]]:inset-ring-2 data-[remote-presence=true]:[&_[contenteditable=true]]:inset-ring-[var(--collaboration-presence-color)] data-[remote-presence=true]:[&_[role=combobox]]:inset-ring-2 data-[remote-presence=true]:[&_[role=combobox]]:inset-ring-[var(--collaboration-presence-color)]"
      data-rakun-collaboration-field-id={id}
      data-remote-presence={Boolean(remoteParticipant) || undefined}
      style={presenceStyle}
    >
      {error && <p className='mb-1 text-sm text-red-500'>{error}</p>}
      {children}
    </div>
  )
}

FieldWrapper.displayName = 'FieldWrapper'
