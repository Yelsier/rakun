'use client'

import type { EncodedContentType, TemplateStateOutput } from '@rakun-kit/core/client'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

import ContentTypeEdit from '../ContentTypeEdit'
import type { FieldRef } from '../ContentTypeEdit'
import type { FieldValue } from '../_fields/shared'

import { useManagerMutation } from '@/client/react'
import {
  TemplateCollaborationProvider,
  useContentCollaboration,
} from '@/collaboration/ContentCollaborationProvider'
import type { ContentCollaborationStatus } from '@/collaboration/ContentCollaborationProvider'
import ErrorMessage from '@/components/error'
import Loading from '@/components/loading'
import { useTranslations } from '@/i18n'

export type CollaborativeTemplateEditorRef = FieldRef & {
  discardChanges: () => Promise<void>
  save: () => Promise<TemplateStateOutput>
}

type CollaborativeTemplateFormProps = {
  contentType: EncodedContentType
  data: Record<string, unknown>
  parentContentType: EncodedContentType
  revision: number
  onPendingChange: (pending: boolean) => void
  onStatusChange: (status: ContentCollaborationStatus) => void
}

const CollaborativeTemplateForm = forwardRef<
  CollaborativeTemplateEditorRef,
  CollaborativeTemplateFormProps
>((props, ref) => {
  const collaboration = useContentCollaboration()
  const formRef = useRef<FieldRef>(null)
  const saveMutation = useManagerMutation('manager.templateCollaboration.save')

  useEffect(() => {
    props.onPendingChange(saveMutation.isPending)
  }, [props, saveMutation.isPending])

  useEffect(() => {
    if (collaboration) props.onStatusChange(collaboration.status)
  }, [collaboration, props])

  useImperativeHandle(
    ref,
    (): CollaborativeTemplateEditorRef => ({
      getState: () => formRef.current?.getState(),
      getValue: () => formRef.current?.getValue(),
      discardChanges: async () => {
        if (!collaboration) throw new Error('Template collaboration is unavailable')
        await collaboration.discardChanges()
      },
      save: async () => {
        if (!collaboration) throw new Error('Template collaboration is unavailable')
        await collaboration.flush()
        const saved = await saveMutation.mutateAsync({
          contentType: props.parentContentType.name,
        })
        collaboration.setSavedStateVector(
          saved.savedStateVector,
          saved.template.revision,
        )
        return saved.template
      },
    }),
    [collaboration, props.parentContentType.name, saveMutation],
  )

  return (
    <ContentTypeEdit
      key={`template-collaboration:${props.revision}`}
      defaultData={props.data as Record<string, FieldValue>}
      ref={formRef}
      contentType={props.contentType}
      parentContentType={props.parentContentType}
      id={props.contentType.name}
      collapsible
      hideTitle
      collaborative
    />
  )
})

CollaborativeTemplateForm.displayName = 'CollaborativeTemplateForm'

export const CollaborativeTemplateEditor = forwardRef<
  CollaborativeTemplateEditorRef,
  {
    contentType: EncodedContentType
    initialData: Record<string, FieldValue>
    parentContentType: EncodedContentType
    onPendingChange: (pending: boolean) => void
    onStatusChange: (status: ContentCollaborationStatus) => void
    sourceRevision?: number
  }
>((props, ref) => {
  const t = useTranslations()

  return (
    <TemplateCollaborationProvider
      contentType={props.parentContentType.name}
      fieldRootId={props.contentType.name}
      initialData={props.initialData as Record<string, unknown>}
      sourceRevision={props.sourceRevision}
    >
      {({ data, error, ready, revision }) => {
        if (error && !ready) {
          return (
            <ErrorMessage
              _tag="CollaborationUnavailable"
              message={t('contentEdit.collaborationUnavailable')}
            />
          )
        }
        if (!ready) return <Loading />

        return (
          <CollaborativeTemplateForm
            ref={ref}
            contentType={props.contentType}
            data={data}
            parentContentType={props.parentContentType}
            revision={revision}
            onPendingChange={props.onPendingChange}
            onStatusChange={props.onStatusChange}
          />
        )
      }}
    </TemplateCollaborationProvider>
  )
})

CollaborativeTemplateEditor.displayName = 'CollaborativeTemplateEditor'
