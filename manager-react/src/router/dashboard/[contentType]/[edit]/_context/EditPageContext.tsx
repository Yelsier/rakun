'use client'

import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

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
  hasNonIterables ? 'info' : hasIterables ? 'content' : hasSeo ? 'seo' : 'versions'

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

    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
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
  contentTypeId?: string
  contentTypeName: string
  documentActions: ReturnType<typeof useContentDocumentActions>
  editableVisibility: EditableDocumentVisibility
  form: ReturnType<typeof useEditFormController>
  handleTabChange: (value: string) => void
  handleVisibilityChange: (visibility: EditableDocumentVisibility) => void
  hasVersioning: boolean
  hasVisibility: boolean
  isTrashed: boolean
  languageCode: string
  languageList: ReturnType<typeof useLanguage>['languageList']
  onAfterRestore?: () => Promise<unknown> | unknown
  openMoveToTrashDialog: () => void
  openPermanentDeleteDialog: () => void
  permanentDeleteOpen: boolean
  previewState: ReturnType<typeof useContentPreview>
  routeLayout: ReturnType<typeof useRouteLayoutData>
  sections: ReturnType<typeof useContentTypeSections>
  setMoveToTrashOpen: (open: boolean) => void
  setPermanentDeleteOpen: (open: boolean) => void
  showSaveErrorTooltip: boolean
  tabErrors: ReturnType<typeof useEditTabErrors>
  translation: ReturnType<typeof useTranslationDialogState>
  translationEnabled: boolean
  moveToTrashOpen: boolean
}

const EditPageContext = createContext<EditPageContextValue | null>(null)

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
  const contentTypeId = (defaultData as { _id?: string } | undefined)?._id
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
    defaultData,
    hasVisibility,
    setSaveErrorVisible: setShowSaveErrorTooltip,
    visibility,
  })
  const saveFormState = form.saveState
  const documentActions = useContentDocumentActions({
    closeMoveToTrashDialog: () => setMoveToTrashOpen(false),
    closePermanentDeleteDialog: () => setPermanentDeleteOpen(false),
    contentTypeId,
    contentTypeName: contentType.name,
    defaultData,
    hasVersioning,
    onAfterRestore,
    readFormData: form.readFormData,
    replaceDraft: form.replaceDraft,
    setVisibility,
    visibilityBeforeTrash,
  })
  const routeLayout = useRouteLayoutData({
    contentTypeName: contentType.name,
    contentTypeId,
  })
  const translation = useTranslationDialogState({
    currentLanguageCode: language.code,
    languageList,
  })
  const previewRoute = (
    (contentType as typeof contentType & { routes?: ContentTypeRouteMeta[] }).routes ?? []
  ).find((route) => route.hasPage)
  const canPreview = Boolean(preview && previewRoute && !isTrashed)
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
    if (editErrors.length === 0) {
      setShowSaveErrorTooltip(false)
    }
  }, [editErrors.length])

  const handleTabChange = (value: string) => {
    form.saveState()
    setActiveTab(value as EditPageTab)
  }

  const handleVisibilityChange = (nextVisibility: EditableDocumentVisibility) => {
    setVisibility(nextVisibility)
  }

  return (
    <EditPageContext.Provider
      value={{
        activeTab,
        canPreview,
        canRestoreVersions,
        contentTypeId,
        contentTypeName: contentType.name,
        documentActions,
        editableVisibility,
        form,
        handleTabChange,
        handleVisibilityChange,
        hasVersioning,
        hasVisibility,
        isTrashed,
        languageCode: language.code,
        languageList,
        moveToTrashOpen,
        onAfterRestore,
        openMoveToTrashDialog: () => setMoveToTrashOpen(true),
        openPermanentDeleteDialog: () => setPermanentDeleteOpen(true),
        permanentDeleteOpen,
        previewState,
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
