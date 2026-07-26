'use client'

import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { LocaleVariantListOutput, LanguageSchema } from '@rakun-kit/core/client'
import type {
  LinkedIteratorAction,
  LinkedIteratorControl,
  LinkedIteratorStateOutput,
} from '@rakun-kit/core/client'
import { ITERATOR_FIELD_NAME } from '@rakun-kit/core/client'

import { useContentDocumentActions } from '../_hooks/useContentDocumentActions'
import {
  useContentPreview,
  type PreviewModuleSelectMessage,
} from '../_hooks/useContentPreview'
import { useContentTypeSections } from '../_hooks/useContentTypeSections'
import { useEditFormController } from '../_hooks/useEditFormController'
import { useEditTabErrors } from '../_hooks/useEditTabErrors'
import { useRouteLayoutData } from '../_hooks/useRouteLayoutData'
import { useTranslationDialogState } from '../_hooks/useTranslationDialogState'
import type {
  ContentTypeRouteMeta,
  DocumentVisibility,
  EditableDocumentVisibility,
  EditPageProps,
  EditPageTab,
} from '../edit.types'
import type { FieldValue } from '../_fields/shared'

import { useEditErrorStore } from '@/hooks/app-store'
import { useOptionalManagerNavigation } from '@/state/navigation'
import { useLanguage } from '@/state/language'
import { useSession } from '@/state/session'
import { useManagerQuery } from '@/client/react'
import { deepEqual } from '@/helpers/deepEqual'

const getDefaultVisibility = (defaultData?: Record<string, FieldValue>) =>
  ((defaultData as { _visibility?: DocumentVisibility } | undefined)?._visibility ??
    'draft') as DocumentVisibility

const getInitialTab = ({
  hasIterables,
  hasNonIterables,
  hasSeo,
}: {
  hasIterables: boolean
  hasNonIterables: boolean
  hasSeo: boolean
}): EditPageTab =>
  hasNonIterables ? 'info' : hasIterables ? 'content' : hasSeo ? 'seo' : 'history'

const managerPreviewSelectedClassName = 'rakun-manager-preview-selected'

const escapeCssValue = (value: string) => {
  if (typeof window.CSS?.escape === 'function') {
    return window.CSS.escape(value)
  }

  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

const highlightManagerPreviewTarget = (selectors: string[]) => {
  const run = () => {
    const target = selectors
      .map((selector) => document.querySelector<HTMLElement>(selector))
      .find((element): element is HTMLElement => Boolean(element))

    if (!target) return

    const scrollArea = document.querySelector<HTMLElement>(
      '[data-rakun-manager-edit-scroll-area]',
    )
    const viewport = scrollArea?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    )

    if (viewport?.contains(target)) {
      const viewportRect = viewport.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const top =
        viewport.scrollTop +
        targetRect.top -
        viewportRect.top -
        (viewport.clientHeight - targetRect.height) / 2

      viewport.scrollTo({ top, behavior: 'smooth' })
    }

    target.classList.remove(managerPreviewSelectedClassName)
    void target.offsetWidth
    target.classList.add(managerPreviewSelectedClassName)

    window.setTimeout(() => {
      target.classList.remove(managerPreviewSelectedClassName)
    }, 2200)
  }

  window.requestAnimationFrame(() => window.requestAnimationFrame(run))
}

const getContentModuleSelectors = (message: PreviewModuleSelectMessage) => {
  const rootSelector = '[data-rakun-manager-tab-panel="content"]'
  const selectors: string[] = []

  if (message.moduleId) {
    selectors.push(
      `${rootSelector} [data-rakun-manager-module-id="${escapeCssValue(message.moduleId)}"]`,
    )
  }

  if (message.moduleIndex !== undefined) {
    selectors.push(`${rootSelector} [data-rakun-manager-module-index="${message.moduleIndex}"]`)
  }

  return selectors
}

type EditPageContextValue = {
  activeTab: EditPageTab
  canPreview: boolean
  canRestoreVersions: boolean
  contentType: EditPageProps['contentType']
  contentTypeId?: string
  contentTypeName: string
  documentActions: ReturnType<typeof useContentDocumentActions>
  editableVisibility: EditableDocumentVisibility
  form: ReturnType<typeof useEditFormController>
  handleTabChange: (value: string) => void
  handleVisibilityChange: (visibility: EditableDocumentVisibility) => void
  hasVersioning: boolean
  hasLocaleVariants: boolean
  hasVisibility: boolean
  isTrashed: boolean
  languageCode: string
  languageList: ReturnType<typeof useLanguage>['languageList']
  onAfterRestore?: () => Promise<unknown> | unknown
  openMoveToTrashDialog: () => void
  openPermanentDeleteDialog: () => void
  permanentDeleteOpen: boolean
  previewState: ReturnType<typeof useContentPreview>
  localeVariantRoute?: ContentTypeRouteMeta
  routeLayout: ReturnType<typeof useRouteLayoutData>
  sections: ReturnType<typeof useContentTypeSections>
  setMoveToTrashOpen: (open: boolean) => void
  setPermanentDeleteOpen: (open: boolean) => void
  showSaveErrorTooltip: boolean
  tabErrors: ReturnType<typeof useEditTabErrors>
  translation: ReturnType<typeof useTranslationDialogState>
  translationEnabled: boolean
  moveToTrashOpen: boolean
  linkedIterator: {
    enabled: boolean
    state?: LinkedIteratorStateOutput
    mode: 'linked' | 'unlinked'
    setMode: (mode: 'linked' | 'unlinked') => void
    adoptShared: () => void
  }
}

const EditPageContext = createContext<EditPageContextValue | null>(null)

const getLanguageFallbackChain = (
  language: LanguageSchema,
  languageList: LanguageSchema[],
) => {
  const result: LanguageSchema[] = []
  const seen = new Set<string>()
  let current: LanguageSchema | undefined = language

  while (current && !seen.has(current._id)) {
    result.push(current)
    seen.add(current._id)
    current = languageList.find((item) => item._id === current?.parent?._id)
  }

  const defaultLanguage = languageList.find((item) => item.default)
  if (defaultLanguage && !seen.has(defaultLanguage._id)) {
    result.push(defaultLanguage)
  }

  return result
}

const resolveLocaleVariantDocumentId = ({
  data,
  language,
  languageList,
}: {
  data?: LocaleVariantListOutput
  language: LanguageSchema
  languageList: LanguageSchema[]
}) => {
  if (!data) return undefined

  for (const fallbackLanguage of getLanguageFallbackChain(language, languageList)) {
    const assignment = data.assignments.find(
      (item) => item.language._id === fallbackLanguage._id,
    )
    if (assignment) return assignment.documentId
  }

  return data.primaryDocumentId
}

export const EditPageProvider = ({
  children,
  contentType,
  defaultData,
  preview,
  onAfterRestore,
}: PropsWithChildren<EditPageProps>) => {
  const { language, languageList } = useLanguage()
  const { hasPermissions } = useSession()
  const navigation = useOptionalManagerNavigation()
  const editErrors = useEditErrorStore((state) => state.errors)
  const sections = useContentTypeSections(contentType)
  const localeVariantRoute = (
    (contentType as typeof contentType & { routes?: ContentTypeRouteMeta[] }).routes ?? []
  ).find((route) => route.hasPage)
  const contentTypeId = (defaultData as { _id?: string } | undefined)?._id
  const linkedIteratorQuery = useManagerQuery({
    name: 'manager.linkedIterator.get',
    input: {
      contentType: contentType.name,
      ...(contentTypeId ? { documentId: contentTypeId } : {}),
    },
    enabled: Boolean(contentType.linkedIterator),
  })
  const linkedIteratorState = linkedIteratorQuery.data as LinkedIteratorStateOutput | undefined
  const [linkedIteratorMode, setLinkedIteratorMode] = useState<'linked' | 'unlinked'>('linked')
  const effectiveDefaultData = useMemo(() => {
    if (defaultData) return defaultData
    if (!linkedIteratorState?.iterator) return defaultData

    return {
      [ITERATOR_FIELD_NAME]: linkedIteratorState.iterator,
    } as Record<string, FieldValue>
  }, [defaultData, linkedIteratorState?.iterator])
  const hasVisibility = Boolean(contentType.documentVisibility)
  const canReadVersions = hasPermissions(['content.ContentVersion.readAny'])
  const canRestoreVersions = hasPermissions(['content.ContentVersion.updateAny'])
  const hasVersioning = Boolean(contentType.versioning) && canReadVersions
  const isTrashed =
    (defaultData as { _trashed?: boolean } | undefined)?._trashed === true ||
    (defaultData as { _visibility?: DocumentVisibility } | undefined)?._visibility === 'trash'
  const [visibility, setVisibility] = useState<DocumentVisibility>(() =>
    getDefaultVisibility(defaultData),
  )
  const visibilityBeforeTrash = ((
    defaultData as { _visibilityBeforeTrash?: EditableDocumentVisibility } | undefined
  )?._visibilityBeforeTrash ?? 'published') as EditableDocumentVisibility
  const editableVisibility = (
    visibility === 'trash' ? visibilityBeforeTrash : visibility
  ) as EditableDocumentVisibility
  const [activeTab, setActiveTab] = useState<EditPageTab>(() => getInitialTab(sections))
  const [showSaveErrorTooltip, setShowSaveErrorTooltip] = useState(false)
  const [moveToTrashOpen, setMoveToTrashOpen] = useState(false)
  const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false)
  const form = useEditFormController({
    defaultData: effectiveDefaultData,
    hasVisibility,
    setSaveErrorVisible: setShowSaveErrorTooltip,
    visibility,
  })
  const saveFormState = form.saveState
  const documentActions = useContentDocumentActions({
    closeMoveToTrashDialog: () => setMoveToTrashOpen(false),
    closePermanentDeleteDialog: () => setPermanentDeleteOpen(false),
    contentType,
    contentTypeId,
    contentTypeName: contentType.name,
    defaultData,
    hasVersioning,
    languageCode: language.code,
    onAfterRestore,
    readFormData: form.readFormData,
    replaceDraft: form.replaceDraft,
    getLinkedIteratorControl: (
      data: Record<string, unknown>,
      requestedAction?: LinkedIteratorAction,
    ): LinkedIteratorControl | undefined => {
      if (!contentType.linkedIterator || !linkedIteratorState?.enabled) return undefined

      const iteratorChanged = !deepEqual(
        data[ITERATOR_FIELD_NAME],
        linkedIteratorState.iterator,
      )
      const action =
        linkedIteratorMode === 'linked'
          ? requestedAction ??
            (linkedIteratorState.configured &&
            iteratorChanged &&
            linkedIteratorState.canUpdateShared
              ? 'update'
              : undefined)
          : undefined

      return {
        mode: linkedIteratorMode,
        ...(action ? { action } : {}),
        ...(linkedIteratorState.revision !== undefined
          ? { revision: linkedIteratorState.revision }
          : {}),
      }
    },
    onLinkedIteratorSaved: async () => {
      await linkedIteratorQuery.refetch()
    },
    setVisibility,
    visibilityBeforeTrash,
  })
  const routeLayout = useRouteLayoutData({
    contentTypeName: contentType.name,
    contentTypeId,
  })
  const localeVariantsQuery = useManagerQuery({
    name: 'manager.localeVariants.list',
    input:
      contentTypeId && localeVariantRoute
        ? {
            contentType: contentType.name,
            documentId: contentTypeId,
            routeKey: localeVariantRoute.key,
          }
        : ({
            contentType: contentType.name,
            documentId: '',
          } as never),
    enabled: Boolean(contentTypeId && localeVariantRoute && !isTrashed),
  })
  const translation = useTranslationDialogState({
    currentLanguageCode: language.code,
    languageList,
  })
  const previewRoute = localeVariantRoute
  const canPreview = Boolean(preview && previewRoute && !isTrashed)
  const targetLocaleVariantDocumentId = useMemo(
    () =>
      resolveLocaleVariantDocumentId({
        data: localeVariantsQuery.data as LocaleVariantListOutput | undefined,
        language,
        languageList,
      }),
    [language, languageList, localeVariantsQuery.data],
  )
  const previousLanguageCodeRef = useRef(language.code)
  const requestedVariantLanguageCodeRef = useRef<string | null>(null)
  const handlePreviewModuleSelect = useCallback(
    (message: PreviewModuleSelectMessage) => {
      if (message.entryType === 'content') {
        if (!sections.hasIterables) return

        saveFormState()
        setActiveTab('content')
        highlightManagerPreviewTarget(getContentModuleSelectors(message))
        return
      }

      if (message.moduleId && message.moduleType && navigation?.push) {
        navigation.push({
          name: 'content.edit',
          contentType: message.moduleType,
          id: message.moduleId,
        })
        return
      }

      const layoutModule = routeLayout.routeLayoutModules.find(
        (item) =>
          item.key === message.layoutKey &&
          (!previewRoute || item.routeKey === previewRoute.key),
      )

      if (!layoutModule) return

      saveFormState()
      setActiveTab(`layout:${layoutModule._id}`)
      highlightManagerPreviewTarget([
        `[data-rakun-manager-layout-key="${escapeCssValue(layoutModule.key)}"]`,
      ])
    },
    [navigation, previewRoute, routeLayout.routeLayoutModules, saveFormState, sections.hasIterables],
  )
  const previewState = useContentPreview({
    canPreview,
    contentTypeName: contentType.name,
    contentTypeId,
    languageCode: language.code,
    onModuleSelect: handlePreviewModuleSelect,
    preview,
    previewRoute,
    readFormData: form.readFormData,
  })
  const tabErrors = useEditTabErrors({
    contentTypeName: contentType.name,
    editErrors,
    sections,
  })
  const translationEnabled = Boolean(contentTypeId && !isTrashed && languageList.length > 1)

  useEffect(() => {
    setVisibility(getDefaultVisibility(defaultData))
  }, [defaultData])

  useEffect(() => {
    if (linkedIteratorState?.mode) {
      setLinkedIteratorMode(linkedIteratorState.mode)
    }
  }, [linkedIteratorState?.mode])

  useEffect(() => {
    if (editErrors.length === 0) {
      setShowSaveErrorTooltip(false)
    }
  }, [editErrors.length])

  useEffect(() => {
    if (previousLanguageCodeRef.current === language.code) return

    previousLanguageCodeRef.current = language.code
    requestedVariantLanguageCodeRef.current = language.code
  }, [language.code])

  useEffect(() => {
    if (requestedVariantLanguageCodeRef.current !== language.code) return
    if (!targetLocaleVariantDocumentId || !contentTypeId) return

    requestedVariantLanguageCodeRef.current = null
    if (targetLocaleVariantDocumentId === contentTypeId) return

    navigation?.replace?.({
      name: 'content.edit',
      contentType: contentType.name,
      id: targetLocaleVariantDocumentId,
    })
  }, [
    contentType.name,
    contentTypeId,
    language.code,
    navigation,
    targetLocaleVariantDocumentId,
  ])

  const handleTabChange = (value: string) => {
    form.saveState()
    setActiveTab(value as EditPageTab)
  }

  const handleVisibilityChange = (nextVisibility: EditableDocumentVisibility) => {
    setVisibility(nextVisibility)
  }

  const adoptSharedIterator = () => {
    if (!linkedIteratorState?.iterator) return

    form.replaceDraft({
      ...(form.draft.current ?? {}),
      [ITERATOR_FIELD_NAME]: linkedIteratorState.iterator as FieldValue,
    })
    setLinkedIteratorMode('linked')
  }

  return (
    <EditPageContext.Provider
      value={{
        activeTab,
        canPreview,
        canRestoreVersions,
        contentType,
        contentTypeId,
        contentTypeName: contentType.name,
        documentActions,
        editableVisibility,
        form,
        handleTabChange,
        handleVisibilityChange,
        hasVersioning,
        hasLocaleVariants: Boolean(contentTypeId && localeVariantRoute && !isTrashed),
        hasVisibility,
        isTrashed,
        languageCode: language.code,
        languageList,
        linkedIterator: {
          enabled: Boolean(contentType.linkedIterator),
          state: linkedIteratorState,
          mode: linkedIteratorMode,
          setMode: setLinkedIteratorMode,
          adoptShared: adoptSharedIterator,
        },
        moveToTrashOpen,
        onAfterRestore,
        openMoveToTrashDialog: () => setMoveToTrashOpen(true),
        openPermanentDeleteDialog: () => setPermanentDeleteOpen(true),
        permanentDeleteOpen,
        previewState,
        localeVariantRoute,
        routeLayout,
        sections,
        setMoveToTrashOpen,
        setPermanentDeleteOpen,
        showSaveErrorTooltip,
        tabErrors,
        translation,
        translationEnabled,
      }}
    >
      {children}
    </EditPageContext.Provider>
  )
}

export const useEditPageContext = () => {
  const context = useContext(EditPageContext)

  if (!context) {
    throw new Error('useEditPageContext must be used inside EditPageProvider')
  }

  return context
}
