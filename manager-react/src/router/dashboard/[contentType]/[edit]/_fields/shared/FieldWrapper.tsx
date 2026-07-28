import React, { useEffect, useImperativeHandle, useRef } from 'react'

import type { FieldRef } from '../../ContentTypeEdit'
import { deepEqual } from '@/helpers/deepEqual'
import { useConditionFieldDispatch } from './condition-state'

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
  })

  const error = errors.find((e) => e.id === id)?.error

  return (
    <>
      {error && <p className='mb-1 text-sm text-red-500'>{error}</p>}
      {children}
    </>
  )
}

FieldWrapper.displayName = 'FieldWrapper'
