'use client'

import { ChevronsUpDown, Languages, Shield } from 'lucide-react'
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { EncodedContentType } from '@rakun-kit/core/client'
import { EncodedFieldUnknown, FieldType } from '@rakun-kit/core/client'
import { EncodedRelationField } from '@rakun-kit/core/client'

import BooleanField from './_fields/BooleanField'
import ContentReferenceField from './_fields/ContentReferenceField'
import DateField from './_fields/Date'
import FileField from './_fields/FileField'
import LinkField from './_fields/LinkField'
import ListField from './_fields/ListField'
import NumberField from './_fields/NumberField'
import RelationField from './_fields/RelationField'
import StringField from './_fields/StringField'
import SelectField from './_fields/Select'
import { FieldValue } from './_fields/shared'
import { evaluateFieldCondition } from './_fields/shared/condition'
import { ConditionFieldStateProvider } from './_fields/shared/condition-state'
import { errorStyle } from './edit.styles'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { decodeCamelCase } from '@/helpers/decodeCamelCase'
import { useEditErrorStore } from '@/hooks/app-store'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { deepEqual } from '@/helpers/deepEqual'

const defaultDataExtractor = (
  fieldName: string,
  defaultData?: Record<string, FieldValue>,
) => {
  if (!defaultData) {
    return undefined
  }

  return defaultData[fieldName]
}

type FieldComponentProps = EncodedFieldUnknown & {
  id: string
  defaultData?: FieldValue
  ref: React.Ref<FieldRef>
  collapsible?: boolean
  parentContentType?: EncodedContentType
}

type FieldComponent = (config: FieldComponentProps) => React.ReactElement

export const fieldsMap = {
  String: StringField,
  Relation: RelationField,
  Number: NumberField,
  Boolean: BooleanField,
  List: ListField,
  Link: LinkField,
  Date: DateField,
  Select: SelectField,
  File: FileField,
  ContentReference: ContentReferenceField,
} as {
  [key in FieldType]: FieldComponent
}

export function useArrayRefs<T>() {
  const refs = useRef<Array<T | null>>([])
  const setRef = (index: number) => (el: T | null) => {
    refs.current[index] = el
  }
  return { refs, setRef }
}

export type FieldRef = {
  getValue: () => unknown
  getState: () => unknown
}

const hasNestedError = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false
  if ('_error' in value) return true
  if (Array.isArray(value)) return value.some(hasNestedError)
  return Object.values(value).some(hasNestedError)
}

const ContentTypeEdit = forwardRef<
  FieldRef,
  {
    contentType: EncodedContentType
    id: string
    defaultData?: { [key: string]: FieldValue }
    collapsible?: boolean
    hideTitle?: boolean
  }
>((props, ref) => {
  const { contentType, id, collapsible, hideTitle } = props

  const { refs, setRef } = useArrayRefs<FieldRef>()
  const errors = useEditErrorStore((state) => state.errors)
  const addError = useEditErrorStore((state) => state.addError)
  const formStateInitialValue = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(contentType.fields).map((fieldName) => [
          fieldName,
          defaultDataExtractor(fieldName, props.defaultData),
        ]),
      ) as Record<string, unknown>,
    [contentType.fields, props.defaultData],
  )
  const [formState, setFormState] = useState(formStateInitialValue)
  const allItems = useMemo(
    () =>
      Object.entries(contentType.fields).filter(
        ([_, fieldValue]) => !(fieldValue.visibility === 'api'),
      ),
    [contentType.fields],
  )
  const visibleItems = useMemo(
    () =>
      allItems.filter(([, fieldValue]) =>
        evaluateFieldCondition(fieldValue.condition, formState),
      ),
    [allItems, formState],
  )
  const visibleFieldNames = useMemo(
    () => new Set(visibleItems.map(([fieldName]) => fieldName)),
    [visibleItems],
  )
  const handleFieldStateChange = useCallback(
    (fieldId: string, state: unknown) => {
      const prefix = `${id}.`
      const fieldName = fieldId.startsWith(prefix)
        ? fieldId.slice(prefix.length)
        : fieldId

      if (fieldName.includes('.')) {
        return
      }

      setFormState((previous) => {
        if (deepEqual(previous[fieldName], state)) {
          return previous
        }

        return {
          ...previous,
          [fieldName]: state,
        }
      })
    },
    [id],
  )

  useImperativeHandle(
    ref,
    (): FieldRef => ({
      getValue: () => {
        const values = Object.fromEntries(
          allItems.map(([fieldName], i) => {
            if (!visibleFieldNames.has(fieldName)) {
              return [fieldName, null]
            }

            return [fieldName, refs.current[i]?.getValue()]
          }),
        )

        if (Object.values(values).some(hasNestedError)) {
          const _error = 'Please fix the errors above'
          addError(id, _error)
          return { _error }
        }

        return { ...values, _type: contentType.name }
      },
      getState: () => {
        const states = Object.fromEntries(
          allItems.map(([fieldName], i) => {
            if (!visibleFieldNames.has(fieldName)) {
              return [fieldName, formState[fieldName]]
            }

            return [fieldName, refs.current[i]?.getState()]
          }),
        )
        return states
      },
    }),
    [addError, allItems, contentType.name, formState, id, visibleFieldNames],
  )

  return (
    <ConditionFieldStateProvider
      value={{ onFieldStateChange: handleFieldStateChange }}
    >
      <div className='flex flex-1 flex-col gap-8 mx-auto w-full'>
        {allItems.map(([fieldName, fieldValue], i) => {
          const isVisible = visibleFieldNames.has(fieldName)

          if (!isVisible) {
            return null
          }

          const error = errors.find((e) => e.id === id + '.' + fieldName)?.error
          const FieldComponent = fieldsMap[
            fieldValue.config.type
          ] as FieldComponent
          const field = (
            <FieldComponent
              id={id + '.' + fieldName}
              ref={setRef(i)}
              {...fieldValue}
              defaultData={defaultDataExtractor(fieldName, props.defaultData)}
              parentContentType={contentType}
            />
          )

          const Tags = () => (
            <div className='flex items-center gap-2'>
              {fieldValue.isTranslatable && <Languages size={16} />}
              {fieldValue.isRequired && <Shield size={16} />}
            </div>
          )

          const canCollapse =
            fieldValue.config.ui === 'ContentType' &&
            (fieldValue as EncodedRelationField).only === 'new' &&
            collapsible

          if (canCollapse) {
            return (
              <Collapsible defaultOpen key={fieldName}>
                <Card className={errorStyle({ error: !!error })}>
                  <CardHeader className='gap-0'>
                    <CollapsibleTrigger>
                      <div className='flex justify-between items-center cursor-pointer'>
                        <CardTitle className='flex items-center gap-2 '>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='size-8'
                            asChild
                          >
                            <div>
                              <ChevronsUpDown />
                              <span className='sr-only'>Toggle</span>
                            </div>
                          </Button>
                          {decodeCamelCase(fieldName)}
                        </CardTitle>
                        <Tags />
                      </div>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent
                    forceMount
                    className='data-[state=closed]:hidden'
                  >
                    <CardContent>{field}</CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          }

          return (
            <div
              key={fieldName}
              className={canCollapse ? 'bg-red-600' : undefined}
            >
              {hideTitle ? null : (
                <CardTitle className='flex justify-between items-center gap-2 mb-4'>
                  {decodeCamelCase(fieldName)}
                  <Tags />
                </CardTitle>
              )}
              {field}
            </div>
          )
        })}
      </div>
    </ConditionFieldStateProvider>
  )
})

export default ContentTypeEdit
