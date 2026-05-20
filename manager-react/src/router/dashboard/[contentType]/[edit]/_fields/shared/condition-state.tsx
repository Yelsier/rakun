import { createContext, useContext } from 'react'

type ConditionFieldStateContextValue = {
  onFieldStateChange: (id: string, state: unknown) => void
}

const ConditionFieldStateContext =
  createContext<ConditionFieldStateContextValue | null>(null)

export const ConditionFieldStateProvider = ConditionFieldStateContext.Provider

export const useConditionFieldState = () =>
  useContext(ConditionFieldStateContext)
