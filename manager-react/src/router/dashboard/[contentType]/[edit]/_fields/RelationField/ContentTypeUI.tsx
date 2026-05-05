import { Plus, Trash } from 'lucide-react'
import { useRef, useState } from 'react'
import { RelationFieldValue } from '@rakun-kit/core'

import type { RelationPropsRef } from '.'
import type { FieldRef } from '../../ContentTypeEdit'
import { FieldWrapper } from '../shared/FieldWrapper'
import ExistingRelation from './ExistingRelation'
import NewRelation from './NewRelation'

import { Button } from '@/components/ui/button'
import { useEditErrorStore } from '@/hooks/app-store'
import { decodeCamelCase } from '@/helpers/decodeCamelCase'

const ContentTypeUI: React.FC<RelationPropsRef> = ({ ref, ...props }) => {
  const [relation, setRelation] = useState<'new' | 'existing' | undefined>(
    props.only || (props.defaultData as RelationFieldValue)?.type || undefined,
  )
  const existingRef = useRef<FieldRef>(null)
  const newRef = useRef<FieldRef>(null)
  const addError = useEditErrorStore((state) => state.addError)
  const removeRelatedErrors = useEditErrorStore(
    (state) => state.removeRelatedErrors,
  )
  const error = useEditErrorStore(
    (state) => state.errors.find((item) => item.id === props.id)?.error,
  )

  const getValue = () => {
    if (props.isTranslatable) {
      const _error =
        "Relations don't support translations yet. Please remove .translatable() from this field"
      addError(props.id, _error)
      return { _error }
    }

    if (relation === 'existing') {
      const existing = existingRef.current?.getValue() as { _id: string }
      if (!existing?._id && props.isRequired) {
        const _error = 'This field is required'
        addError(props.id, _error)
        return { _error }
      }
      return existing
    }

    if (relation === 'new') {
      return newRef.current?.getValue()
    }

    if (props.isRequired) {
      const _error = 'This field is required'
      addError(props.id, _error)
      return { _error }
    }
    return null
  }

  const getState = () => {
    if (relation === 'existing') {
      return existingRef.current?.getState() as object
    }

    if (relation === 'new') {
      return newRef.current?.getState() as object
    }
  }

  return (
    <FieldWrapper
      id={props.id}
      errors={error ? [{ id: props.id, error }] : []}
      getValue={getValue}
      getState={getState}
      ref={ref}
    >
      {relation === undefined && (
        <div className='flex gap-2'>
          <Button
            variant={'outline'}
            onClick={() => {
              setRelation('existing')
              removeRelatedErrors(props.id)
            }}
          >
            <Plus /> Add existing
          </Button>
          <Button
            variant={'outline'}
            onClick={() => {
              setRelation('new')
              removeRelatedErrors(props.id)
            }}
          >
            <Plus /> Add new
          </Button>
        </div>
      )}
      {relation === 'new' && (
        <div>
          {!props.only && (
            <div className='flex gap-2 mb-4 items-center'>
              <Button
                variant={'outline'}
                size={'icon'}
                onClick={() => {
                  setRelation(undefined)
                  removeRelatedErrors(props.id)
                }}
              >
                <Trash />
              </Button>
              <b>New {props.contentType.name}</b>
            </div>
          )}
          <NewRelation ref={newRef} {...props} />
        </div>
      )}
      {relation === 'existing' && (
        <div>
          {!props.only && (
            <div className='flex gap-2 mb-4 items-center'>
              <Button
                variant={'outline'}
                size={'icon'}
                onClick={() => {
                  setRelation(undefined)
                  removeRelatedErrors(props.id)
                }}
              >
                <Trash />
              </Button>
              <b>Existing {decodeCamelCase(props.contentType.name)}</b>
            </div>
          )}
          <ExistingRelation ref={existingRef} {...props} />
        </div>
      )}
    </FieldWrapper>
  )
}

export default ContentTypeUI
