import { useCallback, useEffect, useRef, useState } from 'react'

import type { FieldRef } from '../ContentTypeEdit'
import type { DocumentVisibility } from '../edit.types'
import type { FieldValue } from '../_fields/shared'

type UseEditFormControllerParams = {
  defaultData?: Record<string, FieldValue>
  hasVisibility: boolean
  setSaveErrorVisible: (visible: boolean) => void
  visibility: DocumentVisibility
}

export const useEditFormController = ({
  defaultData,
  hasVisibility,
  setSaveErrorVisible,
  visibility,
}: UseEditFormControllerParams) => {
  const iterablesRef = useRef<FieldRef>(null)
  const nonIterablesRef = useRef<FieldRef>(null)
  const seoRef = useRef<FieldRef>(null)
  const draft = useRef(defaultData)
  const [formRevision, setFormRevision] = useState(0)

  useEffect(() => {
    draft.current = defaultData
    setFormRevision((revision) => revision + 1)
  }, [defaultData])

  const saveState = useCallback(() => {
    draft.current = {
      ...(iterablesRef.current?.getState() as object),
      ...(nonIterablesRef.current?.getState() as object),
      ...(seoRef.current?.getState() as object),
    } as Record<string, FieldValue>
  }, [])

  const readFormData = useCallback(
    ({ showSaveError = true }: { showSaveError?: boolean } = {}) => {
      saveState()
      const iterablesValue = iterablesRef.current?.getValue() as
        | ({ _error?: string } & object)
        | undefined
      const nonIterablesValue = nonIterablesRef.current?.getValue() as
        | ({ _error?: string } & object)
        | undefined
      const seoValue = seoRef.current?.getValue() as ({ _error?: string } & object) | undefined

      if (iterablesValue?._error || nonIterablesValue?._error || seoValue?._error) {
        if (showSaveError) {
          setSaveErrorVisible(true)
        }
        return
      }

      if (showSaveError) {
        setSaveErrorVisible(false)
      }

      return {
        ...(iterablesValue || {}),
        ...(nonIterablesValue || {}),
        ...(seoValue || {}),
        ...(hasVisibility ? { _visibility: visibility } : {}),
      }
    },
    [hasVisibility, saveState, setSaveErrorVisible, visibility],
  )

  const replaceDraft = useCallback((nextDraft: Record<string, FieldValue>) => {
    draft.current = nextDraft
    setFormRevision((revision) => revision + 1)
  }, [])

  return {
    draft,
    formRevision,
    iterablesRef,
    nonIterablesRef,
    seoRef,
    readFormData,
    replaceDraft,
    saveState,
  }
}
