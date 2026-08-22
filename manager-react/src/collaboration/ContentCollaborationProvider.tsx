'use client'

import { equalFlat } from 'lib0/array'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import * as Y from 'yjs'

import { CONTENT_ROOT_NAME, getContentSnapshot, setContentField } from './yDocument'

import { useManagerClient } from '@/client/react'
import { deepEqual } from '@/helpers/deepEqual'

const LOCAL_ORIGIN = Symbol('rakun-local-content-edit')
const REMOTE_ORIGIN = Symbol('rakun-remote-content-sync')
const SYNC_DELAY_MS = 150
const POLL_INTERVAL_MS = 1500
const DOCUMENT_METADATA_FIELDS = new Set([
  '_id',
  '_revision',
  '_schemaVersion',
  '_trashed',
  '_visibilityBeforeTrash',
  '_localeVariantGroupId',
  '_localeVariantRole',
  '_localeVariantName',
  'createdAt',
  'createdBy',
  'trashedAt',
  'trashedBy',
  'updatedAt',
  'updatedBy',
])

const encodeBinary = (value: Uint8Array) => {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < value.length; index += chunkSize) {
    binary += String.fromCharCode(...value.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

const decodeBinary = (value: string) => {
  const binary = atob(value)
  const result = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    result[index] = binary.charCodeAt(index)
  }
  return result
}

export type ContentCollaborationStatus = 'connecting' | 'synced' | 'unsaved' | 'error'

type ContentCollaborationContextValue = {
  documentId: string
  contentType: string
  status: ContentCollaborationStatus
  flush: () => Promise<void>
  setFieldState: (fieldId: string, value: unknown) => void
  setSavedStateVector: (value: string) => void
}

const ContentCollaborationContext = createContext<ContentCollaborationContextValue | null>(null)

type CollaborativeFormScopeValue = {
  enabled: boolean
  rootId?: string
}

const CollaborativeFormScopeContext = createContext<CollaborativeFormScopeValue>({
  enabled: false,
})

export const CollaborativeFormScope = ({
  children,
  enabled,
  rootId,
}: {
  children: ReactNode
  enabled: boolean
  rootId: string
}) => (
  <CollaborativeFormScopeContext.Provider value={{ enabled, rootId }}>
    {children}
  </CollaborativeFormScopeContext.Provider>
)

export const useCollaborativeFieldBridge = () => {
  const collaboration = useContext(ContentCollaborationContext)
  const scope = useContext(CollaborativeFormScopeContext)

  return useCallback(
    (fieldId: string, value: unknown) => {
      if (!scope.enabled || !scope.rootId) return
      collaboration?.setFieldState(fieldId, value)
    },
    [collaboration, scope.enabled, scope.rootId]
  )
}

export const useContentCollaboration = () => useContext(ContentCollaborationContext)

type CollaborationProviderProps = {
  children: (state: {
    data: Record<string, unknown>
    error: Error | null
    ready: boolean
    revision: number
  }) => ReactNode
  contentType: string
  documentId?: string
  fieldRootId: string
  initialData: Record<string, unknown>
  resource: 'content' | 'template'
}

const CollaborationProvider = ({
  children,
  contentType,
  documentId,
  fieldRootId,
  initialData,
  resource,
}: CollaborationProviderProps) => {
  const client = useManagerClient()
  const doc = useMemo(() => new Y.Doc(), [contentType, documentId, resource])
  const metadataRef = useRef<Record<string, unknown>>({})
  metadataRef.current =
    resource === 'content'
      ? Object.fromEntries(
          Object.entries(initialData).filter(([key]) => DOCUMENT_METADATA_FIELDS.has(key))
        )
      : {}
  const withMetadata = useCallback(
    (snapshot: Record<string, unknown>) => ({ ...metadataRef.current, ...snapshot }),
    []
  )
  const [data, setData] = useState<Record<string, unknown>>(initialData)
  const dataRef = useRef(data)
  const [revision, setRevision] = useState(0)
  const updateData = useCallback(
    (snapshot: Record<string, unknown>) => {
      const next = withMetadata(snapshot)
      if (deepEqual(dataRef.current, next)) return
      dataRef.current = next
      setData(next)
      setRevision((current) => current + 1)
    },
    [withMetadata]
  )
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [status, setStatus] = useState<ContentCollaborationStatus>('connecting')
  const savedStateVectorRef = useRef(new Uint8Array())
  const pendingUpdatesRef = useRef<Uint8Array[]>([])
  const syncPromiseRef = useRef<Promise<void> | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setData((previous) => {
      const workingFields = Object.fromEntries(
        Object.entries(previous).filter(([key]) => !DOCUMENT_METADATA_FIELDS.has(key))
      )
      const next = { ...metadataRef.current, ...workingFields }
      dataRef.current = next
      return deepEqual(previous, next) ? previous : next
    })
  }, [initialData])

  const updateStatus = useCallback(() => {
    const dirty = !equalFlat(Y.encodeStateVector(doc), savedStateVectorRef.current)
    setStatus(dirty ? 'unsaved' : 'synced')
  }, [doc])

  const exchange = useCallback(async () => {
    if (syncPromiseRef.current) {
      await syncPromiseRef.current
      if (pendingUpdatesRef.current.length === 0) return
    }

    const pending = pendingUpdatesRef.current
    pendingUpdatesRef.current = []
    const update = pending.length ? Y.mergeUpdates(pending) : undefined
    const stateVector = Y.encodeStateVector(doc)
    const encodedInput = {
      contentType,
      stateVector: encodeBinary(stateVector),
      ...(update ? { update: encodeBinary(update) } : {}),
    }
    const request = (
      resource === 'template'
        ? client.request('manager.templateCollaboration.sync', encodedInput)
        : client.request('manager.contentCollaboration.sync', {
            ...encodedInput,
            documentId: documentId ?? '',
          })
    )
      .then((result) => {
        const remoteUpdate = decodeBinary(result.update)
        if (remoteUpdate.length) Y.applyUpdate(doc, remoteUpdate, REMOTE_ORIGIN)
        savedStateVectorRef.current = decodeBinary(result.savedStateVector)
        setReady(true)
        setError(null)
        updateStatus()
      })
      .catch((cause) => {
        if (update) pendingUpdatesRef.current.unshift(update)
        const nextError = cause instanceof Error ? cause : new Error(String(cause))
        setError(nextError)
        setStatus('error')
        throw cause
      })
      .finally(() => {
        syncPromiseRef.current = null
      })

    syncPromiseRef.current = request
    await request
  }, [client, contentType, doc, documentId, resource, updateStatus])

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    await exchange()
    while (pendingUpdatesRef.current.length) await exchange()
  }, [exchange])

  useEffect(() => {
    const handleUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === LOCAL_ORIGIN) {
        pendingUpdatesRef.current.push(update)
        updateStatus()
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          timerRef.current = null
          void exchange().catch(() => undefined)
        }, SYNC_DELAY_MS)
      }

      if (origin === REMOTE_ORIGIN) {
        updateData(getContentSnapshot(doc))
      }
    }

    doc.on('update', handleUpdate)
    void exchange()
      .then(() => {
        updateData(getContentSnapshot(doc))
        setReady(true)
      })
      .catch(() => undefined)

    const poll = setInterval(() => {
      void exchange().catch(() => undefined)
    }, POLL_INTERVAL_MS)

    return () => {
      doc.off('update', handleUpdate)
      clearInterval(poll)
      if (timerRef.current) clearTimeout(timerRef.current)
      void flush().catch(() => undefined)
    }
  }, [doc, exchange, flush, updateData, updateStatus])

  const setFieldState = useCallback(
    (fieldId: string, value: unknown) => {
      const prefix = `${fieldRootId}.`
      if (!fieldId.startsWith(prefix)) return
      const field = fieldId.slice(prefix.length)
      if (!field || field.includes('.')) return

      const current = doc.getMap<unknown>(CONTENT_ROOT_NAME).get(field)
      const currentJson = current instanceof Y.AbstractType ? current.toJSON() : current
      if (deepEqual(currentJson, value)) return
      setContentField(doc, field, value, LOCAL_ORIGIN)
    },
    [doc, fieldRootId]
  )

  const setSavedStateVector = useCallback(
    (value: string) => {
      savedStateVectorRef.current = decodeBinary(value)
      updateStatus()
    },
    [updateStatus]
  )

  const context = useMemo<ContentCollaborationContextValue>(
    () => ({
      contentType: fieldRootId,
      documentId: documentId ?? '',
      flush,
      setFieldState,
      setSavedStateVector,
      status,
    }),
    [documentId, fieldRootId, flush, setFieldState, setSavedStateVector, status]
  )

  return (
    <ContentCollaborationContext.Provider value={context}>
      {children({ data, error, ready, revision })}
    </ContentCollaborationContext.Provider>
  )
}

export const ContentCollaborationProvider = ({
  children,
  contentType,
  documentId,
  initialData,
}: Omit<CollaborationProviderProps, 'fieldRootId' | 'resource'> & {
  documentId: string
}) => (
  <CollaborationProvider
    contentType={contentType}
    documentId={documentId}
    fieldRootId={contentType}
    initialData={initialData}
    resource="content"
  >
    {children}
  </CollaborationProvider>
)

export const TemplateCollaborationProvider = ({
  children,
  contentType,
  fieldRootId,
  initialData,
}: Omit<CollaborationProviderProps, 'documentId' | 'resource'>) => (
  <CollaborationProvider
    contentType={contentType}
    fieldRootId={fieldRootId}
    initialData={initialData}
    resource="template"
  >
    {children}
  </CollaborationProvider>
)
