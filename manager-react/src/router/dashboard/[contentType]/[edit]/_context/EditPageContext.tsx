'use client'

import {
  createContext,
  type PropsWithChildren,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  EncodedContentType,
  EncodedField,
  LanguageSchema,
  LocaleVariantListOutput,
  TemplateStateOutput,
} from '@rakun-kit/core/client'
import { TEMPLATE_FIELD_NAME } from '@rakun-kit/core/client'
import { toast } from 'sonner'

import { useContentDocumentActions } from '../_hooks/useContentDocumentActions'
import { VariantNameDialog } from '../_components/VariantNameDialog'
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
import type { FieldRef } from '../ContentTypeEdit'

import { useEditErrorStore } from '@/hooks/app-store'
import { useOptionalManagerNavigation } from '@/state/navigation'
import { useLanguage } from '@/state/language'
import { useSession } from '@/state/session'
import { useManagerMutation, useManagerQuery } from '@/client/react'
import { confirm } from '@/components/confirm'
import { deepEqual } from '@/helpers/deepEqual'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { useTranslations } from '@/i18n'

const getDefaultVisibility = (defaultData?: Record<string, FieldValue>) =>
  ((defaultData as { _visibility?: DocumentVisibility } | undefined)?._visibility ??
    'draft') as DocumentVisibility

const getDefaultTab = ({
  hasIterables,
  hasNonIterables,
  hasSeo,
}: {
  hasIterables: boolean
  hasNonIterables: boolean
  hasSeo: boolean
}): EditPageTab =>
  hasNonIterables ? 'info' : hasIterables ? 'content' : hasSeo ? 'seo' : 'history'

const EDIT_TAB_SEARCH_PARAM = 'tab'

const isEditPageTabAvailable = (
  tab: string,
  options: {
    hasIterables: boolean
    hasNonIterables: boolean
    hasSeo: boolean
    hasTemplate: boolean
    hasLocaleVariants: boolean
    hasVersioning: boolean
    hasDocumentId: boolean
    layoutModuleIds: ReadonlySet<string>
  },
): tab is EditPageTab => {
  if (tab === 'info') return options.hasNonIterables
  if (tab === 'content') return options.hasIterables
  if (tab === 'template') return options.hasTemplate
  if (tab === 'seo') return options.hasSeo
  if (tab === 'variants') return options.hasLocaleVariants
  if (tab === 'history') return options.hasVersioning && options.hasDocumentId
  if (tab.startsWith('layout:')) {
    return options.layoutModuleIds.has(tab.slice('layout:'.length))
  }
  return false
}

const readTabFromSearch = (): string | null => {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(EDIT_TAB_SEARCH_PARAM)
}

const writeTabToSearch = (
  tab: EditPageTab,
  replacePath?: (href: string) => void,
) => {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  if (url.searchParams.get(EDIT_TAB_SEARCH_PARAM) === tab) return

  url.searchParams.set(EDIT_TAB_SEARCH_PARAM, tab)
  const next = `${url.pathname}${url.search}${url.hash}`
  if (replacePath) {
    replacePath(next)
    return
  }

  window.history.replaceState(window.history.state, '', next)
}

const getInitialTab = ({
  hasIterables,
  hasNonIterables,
  hasSeo,
  hasTemplate,
  hasLocaleVariants,
  hasVersioning,
  hasDocumentId,
}: {
  hasIterables: boolean
  hasNonIterables: boolean
  hasSeo: boolean
  hasTemplate: boolean
  hasLocaleVariants: boolean
  hasVersioning: boolean
  hasDocumentId: boolean
}): EditPageTab => {
  const fromSearch = readTabFromSearch()
  if (
    fromSearch &&
    isEditPageTabAvailable(fromSearch, {
      hasIterables,
      hasNonIterables,
      hasSeo,
      hasTemplate,
      hasLocaleVariants,
      hasVersioning,
      hasDocumentId,
      layoutModuleIds: new Set(),
    })
  ) {
    return fromSearch
  }

  // layout:* needs module ids loaded later; still accept a layout tab from the URL
  // so refresh lands correctly before route-layout data resolves.
  if (fromSearch?.startsWith('layout:')) {
    return fromSearch as EditPageTab
  }

  return getDefaultTab({ hasIterables, hasNonIterables, hasSeo })
}

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

    const scrollContainer = document.querySelector<HTMLElement>(
      '[data-rakun-manager-edit-scroll-area]',
    )

    if (scrollContainer?.contains(target)) {
      const viewportRect = scrollContainer.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const top =
        scrollContainer.scrollTop +
        targetRect.top -
        viewportRect.top -
        (scrollContainer.clientHeight - targetRect.height) / 2

      scrollContainer.scrollTo({ top, behavior: 'smooth' })
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
  previewState: ReturnType<typeof useContentPreview>
  localeVariantRoute?: ContentTypeRouteMeta
  routeLayout: ReturnType<typeof useRouteLayoutData>
  sections: ReturnType<typeof useContentTypeSections>
  showSaveErrorTooltip: boolean
  tabErrors: ReturnType<typeof useEditTabErrors>
  translation: ReturnType<typeof useTranslationDialogState>
  translationEnabled: boolean
  template: {
    enabled: boolean
    state?: TemplateStateOutput
    contentType?: EncodedContentType
    ref: RefObject<FieldRef | null>
    defaultData?: Record<string, FieldValue>
    pending: boolean
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
  const t = useTranslations()
  const { language, languageList } = useLanguage()
  const { hasPermissions } = useSession()
  const navigation = useOptionalManagerNavigation()
  const editErrors = useEditErrorStore((state) => state.errors)
  const sections = useContentTypeSections(contentType)
  const localeVariantRoute = (
    (contentType as typeof contentType & { routes?: ContentTypeRouteMeta[] }).routes ?? []
  ).find((route) => route.hasPage)
  const contentTypeId = (defaultData as { _id?: string } | undefined)?._id
  const templateQuery = useManagerQuery({
    name: 'manager.template.get',
    input: {
      contentType: contentType.name,
      ...(contentTypeId ? { documentId: contentTypeId } : {}),
    },
    enabled: Boolean(contentType.hasTemplate),
  })
  const templateState = templateQuery.data as TemplateStateOutput | undefined
  const templateMutation = useManagerMutation('manager.template.update')
  const templateRef = useRef<FieldRef>(null)
  const templateContentType = useMemo<EncodedContentType | undefined>(() => {
    if (!contentType.hasTemplate || !contentType.templateField) return undefined

    return {
      ...contentType,
      name: `${contentType.name}Template`,
      fields: {
        [TEMPLATE_FIELD_NAME]: contentType.templateField as EncodedField,
      },
      hasIterator: true,
      hasTemplate: false,
      templateField: undefined,
    }
  }, [contentType])
  const hasVisibility = Boolean(contentType.documentVisibility)
  const canReadVersions = hasPermissions(['content.ContentVersion.readAny'])
  const canRestoreVersions = hasPermissions(['content.ContentVersion.updateAny'])
  const hasVersioning = Boolean(contentType.versioning) && canReadVersions
  const isTrashed =
    (defaultData as { _trashed?: boolean } | undefined)?._trashed === true ||
    (defaultData as { _visibility?: DocumentVisibility } | undefined)?._visibility === 'trash'
  const hasLocaleVariants = Boolean(contentTypeId && localeVariantRoute && !isTrashed)
  const [visibility, setVisibility] = useState<DocumentVisibility>(() =>
    getDefaultVisibility(defaultData),
  )
  const visibilityBeforeTrash = ((
    defaultData as { _visibilityBeforeTrash?: EditableDocumentVisibility } | undefined
  )?._visibilityBeforeTrash ?? 'published') as EditableDocumentVisibility
  const editableVisibility = (
    visibility === 'trash' ? visibilityBeforeTrash : visibility
  ) as EditableDocumentVisibility
  const [activeTab, setActiveTabState] = useState<EditPageTab>(() =>
    getInitialTab({
      hasIterables: sections.hasIterables,
      hasNonIterables: sections.hasNonIterables,
      hasSeo: sections.hasSeo,
      hasTemplate: Boolean(contentType.hasTemplate),
      hasLocaleVariants,
      hasVersioning,
      hasDocumentId: Boolean(contentTypeId),
    }),
  )
  const setActiveTab = useCallback(
    (tab: EditPageTab) => {
      setActiveTabState(tab)
      writeTabToSearch(tab, navigation?.replacePath)
    },
    [navigation?.replacePath],
  )
  const [showSaveErrorTooltip, setShowSaveErrorTooltip] = useState(false)
  const form = useEditFormController({
    defaultData,
    hasVisibility,
    setSaveErrorVisible: setShowSaveErrorTooltip,
    visibility,
  })
  const saveFormState = form.saveState
  const readTemplateModules = useCallback(() => {
    if (!contentType.hasTemplate) return []

    const value = templateRef.current?.getValue() as
      | ({ _error?: string } & Record<string, unknown>)
      | undefined
    if (value?._error) {
      setShowSaveErrorTooltip(true)
      return undefined
    }

    const modules = value?.[TEMPLATE_FIELD_NAME] ?? templateState?.modules
    return Array.isArray(modules) ? modules : undefined
  }, [contentType.hasTemplate, templateState?.modules])
  const saveTemplate = useCallback(async () => {
    if (!contentType.hasTemplate) return true
    if (!templateState) return false

    const modules = readTemplateModules()
    if (!modules) return false
    if (!templateState.canUpdate || deepEqual(modules, templateState.modules)) {
      return true
    }

    try {
      await templateMutation.mutateAsync({
        contentType: contentType.name,
        modules,
        revision: templateState.revision,
      })
      await templateQuery.refetch()
      return true
    } catch (error) {
      toast.error(
        getActionErrorMessage(error, t('contentEdit.couldNotSaveTemplate')),
      )
      return false
    }
  }, [
    contentType.hasTemplate,
    contentType.name,
    readTemplateModules,
    t,
    templateMutation,
    templateQuery,
    templateState,
  ])
  const documentActions = useContentDocumentActions({
    contentType,
    contentTypeId,
    contentTypeName: contentType.name,
    defaultData,
    hasVersioning,
    languageCode: language.code,
    onAfterRestore,
    readFormData: form.readFormData,
    replaceDraft: form.replaceDraft,
    saveTemplate,
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
      if (message.entryType === 'template') {
        if (!contentType.hasTemplate) return

        saveFormState()
        setActiveTab('template')
        return
      }

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
    [
      navigation,
      contentType.hasTemplate,
      previewRoute,
      routeLayout.routeLayoutModules,
      saveFormState,
      sections.hasIterables,
      setActiveTab,
    ],
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
    readTemplateModules,
  })
  const tabErrors = useEditTabErrors({
    contentTypeName: contentType.name,
    editErrors,
    sections,
    templateContentType,
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

    const href = navigation?.href?.({
      name: 'content.edit',
      contentType: contentType.name,
      id: targetLocaleVariantDocumentId,
    })
    const search = typeof window !== 'undefined' ? window.location.search : ''
    if (href && navigation?.replacePath) {
      navigation.replacePath(`${href}${search}`)
      return
    }

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

  useEffect(() => {
    writeTabToSearch(activeTab, navigation?.replacePath)
  }, [activeTab, navigation?.replacePath])

  useEffect(() => {
    const layoutQuery = routeLayout.routeLayoutOverridesQuery
    if (activeTab.startsWith('layout:')) {
      if (!contentTypeId) {
        setActiveTab(
          getDefaultTab({
            hasIterables: sections.hasIterables,
            hasNonIterables: sections.hasNonIterables,
            hasSeo: sections.hasSeo,
          }),
        )
        return
      }

      if (layoutQuery.isPending || (!layoutQuery.data && layoutQuery.isFetching)) {
        return
      }
    }

    const layoutModuleIds = new Set(
      routeLayout.routeLayoutModules.map((layoutModule) => layoutModule._id),
    )
    if (
      isEditPageTabAvailable(activeTab, {
        hasIterables: sections.hasIterables,
        hasNonIterables: sections.hasNonIterables,
        hasSeo: sections.hasSeo,
        hasTemplate: Boolean(contentType.hasTemplate),
        hasLocaleVariants,
        hasVersioning,
        hasDocumentId: Boolean(contentTypeId),
        layoutModuleIds,
      })
    ) {
      return
    }

    setActiveTab(
      getDefaultTab({
        hasIterables: sections.hasIterables,
        hasNonIterables: sections.hasNonIterables,
        hasSeo: sections.hasSeo,
      }),
    )
  }, [
    activeTab,
    contentTypeId,
    contentType.hasTemplate,
    hasLocaleVariants,
    hasVersioning,
    routeLayout.routeLayoutModules,
    routeLayout.routeLayoutOverridesQuery,
    sections.hasIterables,
    sections.hasNonIterables,
    sections.hasSeo,
    setActiveTab,
  ])

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
        contentType,
        contentTypeId,
        contentTypeName: contentType.name,
        documentActions,
        editableVisibility,
        form,
        handleTabChange,
        handleVisibilityChange,
        hasVersioning,
        hasLocaleVariants,
        hasVisibility,
        isTrashed,
        languageCode: language.code,
        languageList,
        template: {
          enabled: Boolean(contentType.hasTemplate),
          state: templateState,
          contentType: templateContentType,
          ref: templateRef,
          defaultData: templateState
            ? ({
                [TEMPLATE_FIELD_NAME]: templateState.modules,
              } as Record<string, FieldValue>)
            : undefined,
          pending: templateMutation.isPending || templateQuery.isLoading,
        },
        onAfterRestore,
        openMoveToTrashDialog: () => {
          void confirm({
            title: t('contentEdit.moveItemToTrash'),
            description: hasLocaleVariants
              ? t('contentEdit.moveToTrashGroupDescription')
              : t('contentEdit.moveToTrashDescription'),
            confirmLabel: t('contentList.moveToTrash'),
            variant: 'destructive',
            onConfirm: () => documentActions.handleMoveToTrash(),
          })
        },
        openPermanentDeleteDialog: () => {
          void confirm({
            title: t('contentEdit.deleteItemPermanently'),
            description: t('contentEdit.deletePermanentlyDescription'),
            confirmLabel: t('contentList.deletePermanently'),
            variant: 'destructive',
            onConfirm: () => documentActions.handlePermanentDelete(),
          })
        },
        previewState,
        localeVariantRoute,
        routeLayout,
        sections,
        showSaveErrorTooltip,
        tabErrors,
        translation,
        translationEnabled,
      }}
    >
      {children}
      <VariantNameDialog
        open={documentActions.variantNameDialog.open}
        loading={documentActions.variantNameDialog.loading}
        onOpenChange={documentActions.variantNameDialog.onOpenChange}
        onConfirm={documentActions.variantNameDialog.onConfirm}
      />
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
