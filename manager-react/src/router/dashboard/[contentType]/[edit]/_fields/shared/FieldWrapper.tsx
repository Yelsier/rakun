import React, { useImperativeHandle } from 'react'

import type { FieldRef } from '../../ContentTypeEdit'

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
  useImperativeHandle(
    ref,
    (): FieldRef => ({
      getValue,
      getState,
    }),
  )

  const error = errors.find((e) => e.id === id)?.error

  return (
    <>
      {error && <p className='mb-1 text-sm text-red-500'>{error}</p>}
      {children}
    </>
  )
}

FieldWrapper.displayName = 'FieldWrapper'
