'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

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

const ConditionFieldStateContext =
  createContext<ConditionFieldStateContextValue | null>(null)

const ConditionFieldDispatchContext =
  createContext<ConditionFieldDispatchContextValue | null>(null)

export const ConditionFieldStateProvider = ({
  fieldState,
  onFieldStateChange,
  children,
}: {
  fieldState: Record<string, unknown>
  onFieldStateChange: (id: string, state: unknown) => void
  children: ReactNode
}) => {
  const dispatchValue = useMemo(
    () => ({ onFieldStateChange }),
    [onFieldStateChange]
  )
  const stateValue = useMemo(() => ({ fieldState }), [fieldState])

  return (
    <ConditionFieldDispatchContext.Provider value={dispatchValue}>
      <ConditionFieldStateContext.Provider value={stateValue}>
        {children}
      </ConditionFieldStateContext.Provider>
    </ConditionFieldDispatchContext.Provider>
  )
}

export const useConditionFieldState = () => useContext(ConditionFieldStateContext)

export const useConditionFieldDispatch = () =>
  useContext(ConditionFieldDispatchContext)
