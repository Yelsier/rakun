'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { CollaborativeFormScope } from '@/collaboration/ContentCollaborationProvider'

type ConditionFieldStateContextValue = {
  fieldState: Record<string, unknown>
}

type ConditionFieldDispatchContextValue = {
  onFieldStateChange: (id: string, state: unknown) => void
}

export const mergeConditionFieldState = (
  documentState: Record<string, unknown> | undefined,
  sectionState: Record<string, unknown>
) => ({
  ...(documentState ?? {}),
  ...sectionState,
})

export const dispatchConditionFieldStateChange = ({
  fieldId,
  onFieldStateChange,
  parentOnFieldStateChange,
  state,
}: {
  fieldId: string
  onFieldStateChange: (id: string, state: unknown) => void
  parentOnFieldStateChange?: (id: string, state: unknown) => void
  state: unknown
}) => {
  onFieldStateChange(fieldId, state)
  parentOnFieldStateChange?.(fieldId, state)
}

const ConditionFieldStateContext = createContext<ConditionFieldStateContextValue | null>(null)

const ConditionFieldDispatchContext = createContext<ConditionFieldDispatchContextValue | null>(null)

export const ConditionFieldStateProvider = ({
  fieldState,
  onFieldStateChange,
  collaborative = false,
  collaborationRootId = '',
  children,
}: {
  fieldState: Record<string, unknown>
  onFieldStateChange: (id: string, state: unknown) => void
  collaborative?: boolean
  collaborationRootId?: string
  children: ReactNode
}) => {
  const parentDispatch = useContext(ConditionFieldDispatchContext)
  const dispatchValue = useMemo(
    () => ({
      onFieldStateChange: (fieldId: string, state: unknown) =>
        dispatchConditionFieldStateChange({
          fieldId,
          onFieldStateChange,
          parentOnFieldStateChange: parentDispatch?.onFieldStateChange,
          state,
        }),
    }),
    [onFieldStateChange, parentDispatch]
  )
  const stateValue = useMemo(() => ({ fieldState }), [fieldState])

  return (
    <CollaborativeFormScope enabled={collaborative} rootId={collaborationRootId}>
      <ConditionFieldDispatchContext.Provider value={dispatchValue}>
        <ConditionFieldStateContext.Provider value={stateValue}>
          {children}
        </ConditionFieldStateContext.Provider>
      </ConditionFieldDispatchContext.Provider>
    </CollaborativeFormScope>
  )
}

export const useConditionFieldState = () => useContext(ConditionFieldStateContext)

export const useConditionFieldDispatch = () => useContext(ConditionFieldDispatchContext)
