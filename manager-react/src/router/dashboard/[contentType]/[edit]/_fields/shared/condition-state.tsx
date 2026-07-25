import { createContext, useContext } from 'react'

type ConditionFieldStateContextValue = {
  fieldState: Record<string, unknown>
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

export const ConditionFieldStateProvider = ConditionFieldStateContext.Provider

export const useConditionFieldState = () =>
  useContext(ConditionFieldStateContext)
