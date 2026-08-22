import { useQueryClient } from '@tanstack/react-query'
import type {
  EncodedContentType,
  EncodedFieldUnknown,
} from '@rakun-kit/core/client'
import { useState } from 'react'
import { toast } from 'sonner'

import type {
  DocumentVisibility,
  EditableDocumentVisibility,
} from '../edit.types'
import type { FieldValue } from '../_fields/shared'

import {
  createManagerQueryKey,
  useManagerMutation,
  useManagerQuery,
} from '@/client/react'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { useTranslations } from '@/i18n'
import { useManagerNavigation } from '@/state/navigation'
import { useContentCollaboration } from '@/collaboration/ContentCollaborationProvider'

const DRAFT_COPY_SUFFIX = '-draft'

const draftCopyMetadataKeys = new Set([
  '_id',
  '_revision',
  '_schemaVersion',
  '_trashed',
  '_visibilityBeforeTrash',
  'createdAt',
  'createdBy',
  'trashedAt',
  'trashedBy',
  'updatedAt',
  'updatedBy',
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const isTranslatableRecord = (
  value: unknown,
): value is Record<string, unknown> & { _tag: 'Translatable' } =>
  isRecord(value) && value._tag === 'Translatable'

const cloneRecord = (value: Record<string, unknown>) =>
  structuredClone(value) as Record<string, unknown>

const withDraftCopySuffix = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.length > 0 ? `${value}${DRAFT_COPY_SUFFIX}` : value
  }

  if (isTranslatableRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === '_tag' ? item : withDraftCopySuffix(item),
      ]),
    )
  }

  return value
}

const isSlugField = (field: EncodedFieldUnknown) =>
  field.config.type === 'String' && field.config.ui === 'Slug'

const isTitleField = (fieldName: string, field: EncodedFieldUnknown) =>
  fieldName.toLowerCase() === 'title' && field.config.type === 'String'

const getDraftCopySuffixFieldNames = (contentType: EncodedContentType) => {
  const uniqueFieldNames = new Set((contentType.uniques ?? []).flat())

  return Object.entries(contentType.fields)
    .filter(
      ([fieldName, field]) =>
        (uniqueFieldNames.has(fieldName) && isSlugField(field)) ||
        isTitleField(fieldName, field),
    )
    .map(([fieldName]) => fieldName)
}

const createDraftCopyData = (
  contentType: EncodedContentType,
  source: Record<string, unknown>,
) => {
  const data = cloneRecord(source)

  draftCopyMetadataKeys.forEach((fieldName) => {
    delete data[fieldName]
  })

  data._visibility = 'draft'
  data._type = contentType.name

  getDraftCopySuffixFieldNames(contentType).forEach((fieldName) => {
    if (fieldName in data) {
      data[fieldName] = withDraftCopySuffix(data[fieldName])
    }
  })

  return data
}

type UseContentDocumentActionsParams = {
  contentType: EncodedContentType
  contentTypeId?: string
  contentTypeName: string
  defaultData?: Record<string, FieldValue>
  hasVersioning: boolean
  languageCode: string
  onAfterRestore?: () => Promise<unknown> | unknown
  readFormData: () => unknown | undefined
  replaceDraft: (nextDraft: Record<string, FieldValue>) => void
  saveTemplate?: () => Promise<boolean>
  setVisibility: (visibility: DocumentVisibility) => void
  visibilityBeforeTrash: EditableDocumentVisibility
}

export const useContentDocumentActions = ({
  contentType,
  contentTypeId,
  contentTypeName,
  defaultData,
  hasVersioning,
  languageCode,
  onAfterRestore,
  readFormData,
  replaceDraft,
  saveTemplate,
  setVisibility,
  visibilityBeforeTrash,
}: UseContentDocumentActionsParams) => {
  const t = useTranslations()
  const navigation = useManagerNavigation()
  const queryClient = useQueryClient()
  const createMutation = useManagerMutation('manager.create')
  const updateMutation = useManagerMutation('manager.update')
  const collaborationSaveMutation = useManagerMutation(
    'manager.contentCollaboration.save',
  )
  const deleteMutation = useManagerMutation('manager.delete')
  const trashMutation = useManagerMutation('manager.trash')
  const translateDocumentMutation = useManagerMutation('manager.translateDocument')
  const createContentVersionMutation = useManagerMutation('manager.contentVersions.create')
  const promoteContentVersionMutation = useManagerMutation('manager.contentVersions.promote')
  const collaboration = useContentCollaboration()
  const [pendingVariantData, setPendingVariantData] =
    useState<Record<string, unknown> | null>(null)
  const routeableVersionRoute = contentType.routes?.find((route) => route.hasPage)
  const reviewStateQuery = useManagerQuery({
    name: 'manager.reviews.get',
    input: contentTypeId
      ? { contentType: contentTypeName, documentId: contentTypeId }
      : ({ contentType: contentTypeName, documentId: '' } as never),
    enabled: Boolean(contentTypeId),
  })
  const contentVersionsQuery = useManagerQuery({
    name: 'manager.contentVersions.list',
    input:
      contentTypeId && routeableVersionRoute
        ? {
            contentType: contentTypeName,
            documentId: contentTypeId,
            routeKey: routeableVersionRoute.key,
          }
        : ({
            contentType: contentTypeName,
            documentId: '',
          } as never),
    enabled: Boolean(contentTypeId && routeableVersionRoute),
  })
  const currentVersion = contentVersionsQuery.data?.documents.find(
    (document) => document.documentId === contentTypeId,
  )
  const persistedVisibility = currentVersion?.visibility ?? defaultData?._visibility
  const hasPublishedSibling = Boolean(
    contentVersionsQuery.data?.documents.some(
      (document) =>
        document.documentId !== contentTypeId &&
        document.visibility === 'published',
    ),
  )
  const canPublishApprovedDraft = Boolean(
    routeableVersionRoute &&
      contentVersionsQuery.data &&
      persistedVisibility === 'draft' &&
      currentVersion?.visibility === 'draft' &&
      reviewStateQuery.data?.review?.status === 'approved' &&
      !hasPublishedSibling,
  )

  const invalidateContentListQueries = async () => {
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const [prefix, name, input] = query.queryKey as [
          string?,
          string?,
          { contentType?: string }?,
        ]

        return (
          prefix === 'rakun-manager' &&
          name === 'manager.list' &&
          input?.contentType === contentTypeName
        )
      },
    })
  }

  const invalidateVersions = async () => {
    if (!hasVersioning || !contentTypeId) return

    await queryClient.invalidateQueries({
      queryKey: createManagerQueryKey('manager.versions.list', {
        contentType: contentTypeName,
        documentId: contentTypeId,
      }),
    })
  }

  const invalidateLocaleVariantQueries = async () => {
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const [, name, input] = query.queryKey as [
          string?,
          string?,
          { contentType?: string }?,
        ]

        return (
          name === 'manager.localeVariants.list' &&
          input?.contentType === contentTypeName
        )
      },
    })
  }

  const refreshReviewState = async () => {
    if (!contentTypeId) return

    const reviewInput = {
      contentType: contentTypeName,
      documentId: contentTypeId,
    }
    await Promise.all([
      reviewStateQuery.refetch(),
      queryClient.invalidateQueries({
        queryKey: createManagerQueryKey(
          'manager.reviews.candidates',
          reviewInput,
        ),
      }),
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [, name, input] = query.queryKey as [
            string?,
            string?,
            { contentType?: string; documentId?: string }?,
          ]
          return (
            name === 'manager.contentVersions.list' &&
            input?.contentType === contentTypeName &&
            input.documentId === contentTypeId
          )
        },
      }),
    ])
  }

  const handlePublishApprovedDraft = async () => {
    if (
      !contentTypeId ||
      !routeableVersionRoute ||
      !canPublishApprovedDraft
    ) {
      return
    }

    try {
      const assignedLanguageCodes =
        currentVersion?.assignedLanguages.map((language) => language.code) ?? []
      const languageCodes = assignedLanguageCodes.length
        ? assignedLanguageCodes
        : [languageCode]

      await promoteContentVersionMutation.mutateAsync({
        contentType: contentTypeName,
        documentId: contentTypeId,
        routeKey: routeableVersionRoute.key,
        languageCodes,
      })
      setVisibility('published')
      await Promise.all([
        invalidateContentListQueries(),
        invalidateLocaleVariantQueries(),
        invalidateVersions(),
        contentVersionsQuery.refetch(),
        onAfterRestore?.(),
      ])
      await refreshReviewState()
      toast.success(t('contentEdit.publishedIn', { language: languageCode }))
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('contentEdit.couldNotPublishPage')))
    }
  }

  const handleCreate = async (data: Record<string, unknown>) => {
    const result = await createMutation.mutateAsync({
      contentType: contentTypeName,
      data,
    })

    if (result && typeof result === 'object' && '_id' in result) {
      navigation.push?.({
        name: 'content.edit',
        contentType: contentTypeName,
        id: String(result._id),
      })
    }

    await invalidateContentListQueries()
    toast.success(t('contentEdit.createdSuccessfully'))
  }

  const createReviewVariant = async (name: string) => {
    if (!contentTypeId || !routeableVersionRoute || !pendingVariantData) return

    try {
      const result = await createContentVersionMutation.mutateAsync({
        contentType: contentTypeName,
        documentId: contentTypeId,
        name,
        routeKey: routeableVersionRoute.key,
        data: pendingVariantData,
      })
      const nextId = result.document._id
      setPendingVariantData(null)

      if (typeof nextId === 'string') {
        navigation.push?.({
          name: 'content.edit',
          contentType: contentTypeName,
          id: nextId,
        })
      }
      await Promise.all([
        invalidateContentListQueries(),
        invalidateLocaleVariantQueries(),
      ])
      toast.success(t('contentEdit.draftVariantCreatedForReview'))
    } catch (error) {
      toast.error(
        getActionErrorMessage(error, t('contentEdit.couldNotCreateDraftVariant')),
      )
    }
  }

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!contentTypeId) return

    if (
      persistedVisibility === 'draft' &&
      data._visibility === 'published' &&
      reviewStateQuery.data?.policy &&
      reviewStateQuery.data.review?.status === 'approved'
    ) {
      if (routeableVersionRoute && canPublishApprovedDraft) {
        await handlePublishApprovedDraft()
        return
      }
      if (!routeableVersionRoute) {
        await promoteContentVersionMutation.mutateAsync({
          contentType: contentTypeName,
          documentId: contentTypeId,
        })
        await invalidateContentListQueries()
        await reviewStateQuery.refetch()
        toast.success(t('contentEdit.publishedApprovedDraft'))
        return
      }
    }

    if (
      persistedVisibility === 'published' &&
      routeableVersionRoute &&
      reviewStateQuery.data?.actorRequiresReview
    ) {
      setPendingVariantData(cloneRecord(data))
      return
    }

    const result = collaboration
      ? await (async () => {
          await collaboration.flush()
          const saved = await collaborationSaveMutation.mutateAsync({
            contentType: contentTypeName,
            documentId: contentTypeId,
          })
          const savedRevision =
            saved.document &&
            typeof saved.document === 'object' &&
            '_revision' in saved.document &&
            (typeof saved.document._revision === 'string' ||
              typeof saved.document._revision === 'number')
              ? saved.document._revision
              : undefined
          collaboration.setSavedStateVector(
            saved.savedStateVector,
            savedRevision,
          )
          return saved.document
        })()
      : await updateMutation.mutateAsync({
          contentType: contentTypeName,
          id: contentTypeId,
          data,
        })

    if (result && typeof result === 'object' && '_id' in result) {
      navigation.push?.({
        name: 'content.edit',
        contentType: contentTypeName,
        id: String(result._id),
      })
    }

    await invalidateVersions()
    await invalidateContentListQueries()
    await invalidateLocaleVariantQueries()
    await refreshReviewState()
    toast.success(t('contentEdit.updatedSuccessfully'))
  }

  const saveDocument = async () => {
    const data = readFormData()

    if (!isRecord(data)) return
    if (saveTemplate && !(await saveTemplate())) return

    try {
      if (defaultData) {
        await handleUpdate(data)
      } else {
        await handleCreate(data)
      }
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('contentEdit.couldNotSaveDocument')))
    }
  }

  const handleSave = async () => saveDocument()

  const handleSaveAsDraft = async () => {
    const data = readFormData()

    if (!isRecord(data)) return
    if (saveTemplate && !(await saveTemplate())) return

    try {
      const result = await createMutation.mutateAsync({
        contentType: contentTypeName,
        data: createDraftCopyData(contentType, data),
      })

      if (result && typeof result === 'object' && '_id' in result) {
        navigation.push?.({
          name: 'content.edit',
          contentType: contentTypeName,
          id: String(result._id),
        })
      }

      await invalidateContentListQueries()
      toast.success(t('contentEdit.draftCopyCreated'))
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('contentEdit.couldNotCreateDraftCopy')))
    }
  }

  const handleRestoreFromTrash = async () => {
    if (!contentTypeId) return

    const restoredVisibility = visibilityBeforeTrash

    await updateMutation.mutateAsync({
      contentType: contentTypeName,
      id: contentTypeId,
      data: {
        _trashed: false,
        _visibility: restoredVisibility,
      },
    })
    setVisibility(restoredVisibility)
    await invalidateContentListQueries()
    await onAfterRestore?.()
    toast.success(t('contentEdit.restoredFromTrash'))
  }

  const handleMoveToTrash = async () => {
    if (!contentTypeId) return

    try {
      await trashMutation.mutateAsync({
        contentType: contentTypeName,
        id: contentTypeId,
      })
      await invalidateContentListQueries()
      await onAfterRestore?.()
      toast.success(t('contentEdit.movedToTrash'))
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('contentEdit.couldNotMoveToTrash')))
      throw error
    }
  }

  const handlePermanentDelete = async () => {
    if (!contentTypeId) return

    try {
      await deleteMutation.mutateAsync({
        contentType: contentTypeName,
        id: contentTypeId,
      })
      await invalidateContentListQueries()
      navigation.push?.({
        name: 'content.list',
        contentType: contentTypeName,
      })
      toast.success(t('contentEdit.deletedPermanently'))
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('contentEdit.couldNotDeleteItem')))
      throw error
    }
  }

  const handleTranslateDocument = async ({
    from,
    to,
    overwrite,
  }: {
    from: string
    to: string[]
    overwrite: boolean
  }) => {
    if (!contentTypeId) return
    if (to.length === 0) {
      toast.error(t('contentList.selectTargetLanguage'))
      return
    }

    const data = readFormData()

    if (!data) return

    const result = await translateDocumentMutation.mutateAsync({
      contentType: contentTypeName,
      id: contentTypeId,
      from,
      to,
      overwrite,
      data,
    })

    replaceDraft(result.item as Record<string, FieldValue>)
    await invalidateContentListQueries()
    await invalidateVersions()
    await onAfterRestore?.()
    toast.success(t('contentEdit.translatedSuccessfully'))
  }

  return {
    canPublishApprovedDraft,
    handleMoveToTrash,
    handlePermanentDelete,
    handlePublishApprovedDraft,
    handleRestoreFromTrash,
    handleSave,
    handleSaveAsDraft,
    handleTranslateDocument,
    variantNameDialog: {
      open: Boolean(pendingVariantData),
      loading: createContentVersionMutation.isPending,
      onOpenChange: (open: boolean) => {
        if (!open && !createContentVersionMutation.isPending) {
          setPendingVariantData(null)
        }
      },
      onConfirm: createReviewVariant,
    },
    pending: {
      create: createMutation.isPending,
      delete: deleteMutation.isPending,
      trash: trashMutation.isPending,
      translate: translateDocumentMutation.isPending,
      update: updateMutation.isPending,
      collaboration: collaborationSaveMutation.isPending,
      version: createContentVersionMutation.isPending,
      promote: promoteContentVersionMutation.isPending,
    },
  }
}
