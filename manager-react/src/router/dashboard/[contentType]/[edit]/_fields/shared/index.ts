import type { MaybeTranslatableValue, TranslatableValue } from '@rakun-kit/core/types'
import type { SerializedEditorState } from 'lexical'
import { useEffect, useState } from 'react'
import type { ListFieldValueItem } from '@rakun-kit/core/client'
import { RelationFieldValue } from '@rakun-kit/core/client'
import { LinkfieldValue } from '@rakun-kit/core/client'
import type { MenuFieldValue } from '@rakun-kit/core/client'

import { deepEqual } from '@/helpers/deepEqual'
import { useEditErrorStore } from '@/hooks/app-store'
import { useLanguage } from '@/lib/providers/language/LanguageClientProvider'

// Generic types for field values
export type PossibleValues =
  | string
  | number
  | boolean
  | SerializedEditorState
  | string[]
  | undefined
  | LinkfieldValue
  | MenuFieldValue
  | ListFieldValueItem<FieldValue>[]
  | RelationFieldValue

export type FieldValue = PossibleValues | Record<string, PossibleValues>

export type DefaultProps = {
  id: string
  defaultData?: FieldValue
  dynamicFallbackPlaceholder?: string
}

export type DefaultDataTypes<T = FieldValue> =
  | MaybeTranslatableValue<T>
  | undefined

// Type guards
export const isTranslatableData = <T>(
  data: DefaultDataTypes<T>,
): data is TranslatableValue<T> => {
  return (
    typeof data === 'object' &&
    data !== null &&
    '_tag' in data &&
    data._tag === 'Translatable'
  )
}

export const isPrimitiveData = <T>(data: DefaultDataTypes<T>): data is T => {
  return (
    data !== null &&
    (typeof data === 'string' ||
      typeof data === 'number' ||
      typeof data === 'boolean' ||
      typeof data === 'object')
  )
}

const isNullishValue = (val: unknown, defaultValue: unknown) => {
  return (
    (deepEqual(val, defaultValue) ||
      (typeof val === 'string' && val.trim() === '')) &&
    !Array.isArray(val)
  )
}

// Generic field values hook
export function useFieldValues<T>({
  id,
  isRequired = false,
  isTranslatable = false,
  defaultData,
  defaultValue,
  validateValue,
}: {
  id: string
  isRequired?: boolean
  isTranslatable?: boolean
  defaultData?: DefaultDataTypes<T>
  defaultValue: T
  validateValue?: (value: T) => string | null
}) {
  const { language } = useLanguage()
  const [translatesStore, setTranslatesStore] = useState<TranslatableValue<T>>(
    isTranslatable && isTranslatableData(defaultData)
      ? defaultData
      : ({
          _tag: 'Translatable',
        } as TranslatableValue<T>),
  )

  const [value, setValue] = useState<T>(
    isTranslatableData(defaultData) && isTranslatable
      ? (defaultData[language.code] as T) || defaultValue
      : isPrimitiveData(defaultData)
        ? defaultData
        : defaultValue,
  )
  const addError = useEditErrorStore((state) => state.addError)
  const removeRelatedErrors = useEditErrorStore(
    (state) => state.removeRelatedErrors,
  )
  const fieldError = useEditErrorStore(
    (state) => state.errors.find((error) => error.id === id)?.error,
  )

  useEffect(() => {
    if (isTranslatable) {
      const loadLang = translatesStore[language.code] || defaultValue
      setValue((previous) =>
        deepEqual(previous, loadLang) ? previous : loadLang,
      )
    }
  }, [isTranslatable, language.code])

  const getValue = () => {
    // Custom validation
    if (validateValue) {
      if (isTranslatable) {
        const languagesError = Object.entries(translatesStore)
          .map(([lang, val]) => {
            if (val === 'Translatable') return null
            const err = validateValue(val)
            return err ? `In ${lang}: ${err}` : null
          })
          .find((e) => e !== null)

        if (languagesError) {
          addError(id, languagesError)
          return { _error: languagesError }
        }
      } else {
        const validationError = validateValue(value)

        if (validationError) {
          addError(id, validationError)
          return { _error: validationError }
        }
      }
    }

    // Required validation
    if (isRequired) {
      if (isTranslatable) {
        if (
          Object.keys(translatesStore).length === 1 ||
          Object.values(translatesStore).every((v) =>
            isNullishValue(v, defaultValue),
          )
        ) {
          const _error = 'This field is required'
          addError(id, _error)
          return { _error }
        }
      } else {
        if (isNullishValue(value, defaultValue)) {
          const _error = 'This field is required'
          addError(id, _error)
          return { _error }
        }
      }
    }

    if (isTranslatable) {
      const filledTranslations = Object.fromEntries(
        Object.entries(translatesStore).filter(
          ([lang, v]) =>
            lang !== '_tag' &&
            v !== 'Translatable' &&
            !isNullishValue(v, defaultValue),
        ),
      )

      if (Object.keys(filledTranslations).length === 0) {
        return null
      }

      return {
        _tag: 'Translatable',
        ...filledTranslations,
      }
    } else {
      return isNullishValue(value, defaultValue) ? null : value
    }
  }

  const getState = () => {
    return isTranslatable ? translatesStore : value
  }

  const onValueChange = (newValue: T) => {
    removeRelatedErrors(id)
    setValue(newValue)
    if (isTranslatable) {
      setTranslatesStore((prev) => ({
        ...prev,
        [language.code]: newValue,
      }))
    }
  }

  return {
    getValue,
    getState,
    value,
    errors: fieldError ? [{ id, error: fieldError }] : [],
    onValueChange,
    addError,
    translatesStore,
    cleanErrors: () => removeRelatedErrors(id),
  }
}

// Utility function to find error for a field
export const findFieldError = (
  errors: { id: string; error: string }[],
  id: string,
) => {
  return errors.find((e) => e.id === id)?.error
}
