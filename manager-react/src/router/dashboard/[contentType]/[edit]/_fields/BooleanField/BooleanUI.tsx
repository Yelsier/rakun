'use client'

import type { BooleanPropsRef } from '.'
import { useBooleanFieldValues } from '.'
import { FieldWrapper } from '../shared/FieldWrapper'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const BooleanUI: React.FC<BooleanPropsRef> = ({ id, ref, ...props }) => {
  const { value, translatesStore, errors, onValueChange, getState } =
    useBooleanFieldValues({
      id,
      ...props,
    })

  return (
    <FieldWrapper
      id={id}
      errors={errors}
      getValue={() => (props.isTranslatable ? translatesStore : value)}
      getState={getState}
      ref={ref}
    >
      <div className='flex items-center gap-2'>
        <Switch checked={value} onCheckedChange={onValueChange} />
        <Label>{value ? 'On' : 'Off'}</Label>
      </div>
    </FieldWrapper>
  )
}

export default BooleanUI
