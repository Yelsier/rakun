import { useQueryClient } from '@tanstack/react-query'
import type { EncodedContentType, EncodedFieldUnknown } from '@rakun-kit/core/client'
import type {
  LinkedIteratorAction,
  LinkedIteratorControl,
} from '@rakun-kit/core/client'
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
import { deepEqual } from '@/helpers/deepEqual'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { useManagerNavigation } from '@/state/navigation'

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
  closeMoveToTrashDialog: () => void
  closePermanentDeleteDialog: () => void
  contentType: EncodedContentType
  contentTypeId?: string
  contentTypeName: string
  defaultData?: Record<string, FieldValue>
  hasVersioning: boolean
  languageCode: string
  onAfterRestore?: () => Promise<unknown> | unknown
  readFormData: () => unknown | undefined
  replaceDraft: (nextDraft: Record<string, FieldValue>) => void
  getLinkedIteratorControl?: (
    data: Record<string, unknown>,
    requestedAction?: LinkedIteratorAction,
  ) => LinkedIteratorControl | undefined
  onLinkedIteratorSaved?: () => Promise<unknown> | unknown
  setVisibility: (visibility: DocumentVisibility) => void
  visibilityBeforeTrash: EditableDocumentVisibility
}

export const useContentDocumentActions = ({
  closeMoveToTrashDialog,
  closePermanentDeleteDialog,
  contentType,
  contentTypeId,
  contentTypeName,
  defaultData,
  hasVersioning,
  languageCode,
  onAfterRestore,
  readFormData,
  replaceDraft,
  getLinkedIteratorControl,
  onLinkedIteratorSaved,
  setVisibility,
  visibilityBeforeTrash,
}: UseContentDocumentActionsParams) => {
  const navigation = useManagerNavigation()
  const queryClient = useQueryClient()
  const createMutation = useManagerMutation('manager.create')
  const updateMutation = useManagerMutation('manager.update')
  const deleteMutation = useManagerMutation('manager.delete')
  const trashMutation = useManagerMutation('manager.trash')
  const translateDocumentMutation = useManagerMutation('manager.translateDocument')
  const createContentVersionMutation = useManagerMutation('manager.contentVersions.create')
  const promoteContentVersionMutation = useManagerMutation('manager.contentVersions.promote')
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
      defaultData?._visibility === 'draft' &&
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

    const currentData = readFormData()
    const hasUnreviewedChanges =
      isRecord(currentData) &&
      Boolean(defaultData) &&
      Object.keys(contentType.fields).some(
        (fieldName) =>
          !deepEqual(currentData[fieldName], defaultData?.[fieldName]),
      )
    if (hasUnreviewedChanges) {
      toast.error(
        'Save these changes and request a new review before publishing',
      )
      return
    }

    try {
      const assignedLanguageCodes =
        currentVersion?.assignedLanguages.map((language) => language.code) ?? []
      await promoteContentVersionMutation.mutateAsync({
        contentType: contentTypeName,
        documentId: contentTypeId,
        routeKey: routeableVersionRoute.key,
        languageCodes: assignedLanguageCodes.length
          ? assignedLanguageCodes
          : [languageCode],
      })
      setVisibility('published')
      await Promise.all([
        invalidateContentListQueries(),
        invalidateVersions(),
        contentVersionsQuery.refetch(),
      ])
      await refreshReviewState()
      toast.success(`Published in ${languageCode}`)
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not publish page'))
    }
  }

  const handleCreate = async (
    data: Record<string, unknown>,
    requestedAction?: LinkedIteratorAction,
  ) => {
    const result = await createMutation.mutateAsync({
      contentType: contentTypeName,
      data,
      linkedIterator: getLinkedIteratorControl?.(data, requestedAction),
    })

    if (result && typeof result === 'object' && '_id' in result) {
      navigation.push?.({
        name: 'content.edit',
        contentType: contentTypeName,
        id: String(result._id),
      })
    }

    await invalidateContentListQueries()
    toast.success('Created successfully')
  }

  const handleUpdate = async (
    data: Record<string, unknown>,
    requestedAction?: LinkedIteratorAction,
  ) => {
    if (!contentTypeId) return

    if (
      defaultData?._visibility === 'draft' &&
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
        toast.success('Published approved draft')
        return
      }
    }

    if (
      defaultData?._visibility === 'published' &&
      routeableVersionRoute &&
      reviewStateQuery.data?.actorRequiresReview
    ) {
      const result = await createContentVersionMutation.mutateAsync({
        contentType: contentTypeName,
        documentId: contentTypeId,
        routeKey: routeableVersionRoute.key,
        data,
      })
      const nextId = result.document._id
      if (typeof nextId === 'string') {
        navigation.push?.({
          name: 'content.edit',
          contentType: contentTypeName,
          id: nextId,
        })
      }
      await invalidateContentListQueries()
      toast.success('Draft variant created for review')
      return
    }

    const result = await updateMutation.mutateAsync({
      contentType: contentTypeName,
      id: contentTypeId,
      data,
      linkedIterator: getLinkedIteratorControl?.(data, requestedAction),
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
    await refreshReviewState()
    await onLinkedIteratorSaved?.()
    toast.success('Updated successfully')
  }

  const saveDocument = async (requestedAction?: LinkedIteratorAction) => {
    const data = readFormData()

    if (!isRecord(data)) return

    try {
      if (defaultData) {
        await handleUpdate(data, requestedAction)
      } else {
        await handleCreate(data, requestedAction)
      }
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not save document'))
    }
  }

  const handleSave = async () => saveDocument()
  const handleInitializeLinkedIterator = async () =>
    saveDocument('initialize')

  const handleSaveAsDraft = async () => {
    const data = readFormData()

    if (!isRecord(data)) return

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
      toast.success('Draft copy created')
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not create draft copy'))
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
    toast.success('Restored from trash')
  }

  const handleMoveToTrash = async () => {
    if (!contentTypeId) return

    try {
      await trashMutation.mutateAsync({
        contentType: contentTypeName,
        id: contentTypeId,
      })
      closeMoveToTrashDialog()
      await invalidateContentListQueries()
      await onAfterRestore?.()
      toast.success('Moved to trash')
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not move item to trash'))
    }
  }

  const handlePermanentDelete = async () => {
    if (!contentTypeId) return

    try {
      await deleteMutation.mutateAsync({
        contentType: contentTypeName,
        id: contentTypeId,
      })
      closePermanentDeleteDialog()
      await invalidateContentListQueries()
      navigation.push?.({
        name: 'content.list',
        contentType: contentTypeName,
      })
      toast.success('Deleted permanently')
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not delete item'))
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
      toast.error('Select at least one target language')
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
    toast.success('Translated successfully')
  }

  return {
    canPublishApprovedDraft,
    handleMoveToTrash,
    handlePermanentDelete,
    handlePublishApprovedDraft,
    handleRestoreFromTrash,
    handleSave,
    handleInitializeLinkedIterator,
    handleSaveAsDraft,
    handleTranslateDocument,
    pending: {
      create: createMutation.isPending,
      delete: deleteMutation.isPending,
      trash: trashMutation.isPending,
      translate: translateDocumentMutation.isPending,
      update: updateMutation.isPending,
      version: createContentVersionMutation.isPending,
      promote: promoteContentVersionMutation.isPending,
    },
  }
}
