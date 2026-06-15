import { useQueryClient } from '@tanstack/react-query'
import type { EncodedContentType, EncodedFieldUnknown } from '@rakun-kit/core/client'
import { toast } from 'sonner'

import type {
  DocumentVisibility,
  EditableDocumentVisibility,
} from '../edit.types'
import type { FieldValue } from '../_fields/shared'

import { createManagerQueryKey, useManagerMutation } from '@/client/react'
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
  onAfterRestore?: () => Promise<unknown> | unknown
  readFormData: () => unknown | undefined
  replaceDraft: (nextDraft: Record<string, FieldValue>) => void
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
  onAfterRestore,
  readFormData,
  replaceDraft,
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

  const handleCreate = async (data: unknown) => {
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
    toast.success('Created successfully')
  }

  const handleUpdate = async (data: unknown) => {
    if (!contentTypeId) return

    const result = await updateMutation.mutateAsync({
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
    toast.success('Updated successfully')
  }

  const handleSave = async () => {
    const data = readFormData()

    if (!data) return

    if (defaultData) {
      await handleUpdate(data)
    } else {
      await handleCreate(data)
    }
  }

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
    handleMoveToTrash,
    handlePermanentDelete,
    handleRestoreFromTrash,
    handleSave,
    handleSaveAsDraft,
    handleTranslateDocument,
    pending: {
      create: createMutation.isPending,
      delete: deleteMutation.isPending,
      trash: trashMutation.isPending,
      translate: translateDocumentMutation.isPending,
      update: updateMutation.isPending,
    },
  }
}
