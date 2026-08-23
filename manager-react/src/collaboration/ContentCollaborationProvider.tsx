'use client'

import { equalFlat } from 'lib0/array'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'

import { CONTENT_ROOT_NAME, getContentSnapshot, setContentField } from './yDocument'

import { useManagerClient, useSync } from '@/client/react'
import { createSyncTopic } from '@/client/realtime'
import { deepEqual } from '@/helpers/deepEqual'
import { useSession } from '@/state/session'

const LOCAL_ORIGIN = Symbol('rakun-local-content-edit')
const REMOTE_ORIGIN = Symbol('rakun-remote-content-sync')
const SYNC_DELAY_MS = 150
const POLL_INTERVAL_MS = 1500
export const SAVED_STATE_VECTOR_KEY = 'rakun-saved-state-vector'
const LOCAL_METADATA_PREFIX = 'rakun:collaboration:'
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

const getLocalRoomName = (
  resource: 'content' | 'template',
  contentType: string,
  documentId?: string,
  userId?: string,
) =>
  resource === 'template'
    ? `rakun:${encodeURIComponent(userId ?? 'anonymous')}:template:${encodeURIComponent(contentType)}`
    : `rakun:${encodeURIComponent(userId ?? 'anonymous')}:content:${encodeURIComponent(contentType)}:${encodeURIComponent(documentId ?? '')}`

type LocalRoomMetadata = {
  dirty: boolean
  sourceRevision?: string | number
}

const readLocalRoomMetadata = (roomName: string): LocalRoomMetadata | null => {
  try {
    const value = globalThis.localStorage?.getItem(`${LOCAL_METADATA_PREFIX}${roomName}`)
    if (!value) return null
    const parsed = JSON.parse(value) as Partial<LocalRoomMetadata>
    return typeof parsed.dirty === 'boolean'
      ? { dirty: parsed.dirty, sourceRevision: parsed.sourceRevision }
      : null
  } catch {
    return null
  }
}

const writeLocalRoomMetadata = (
  roomName: string,
  metadata: LocalRoomMetadata,
) => {
  try {
    globalThis.localStorage?.setItem(
      `${LOCAL_METADATA_PREFIX}${roomName}`,
      JSON.stringify(metadata),
    )
  } catch {
    // IndexedDB still keeps the Yjs updates when localStorage is unavailable.
  }
}

const toArrayBuffer = (value: Uint8Array) => new Uint8Array(value).buffer

export type ContentCollaborationStatus =
  | 'connecting'
  | 'synced'
  | 'unsaved'
  | 'offline'
  | 'error'

type ContentCollaborationContextValue = {
  documentId: string
  contentType: string
  status: ContentCollaborationStatus
  flush: () => Promise<void>
  setFieldState: (fieldId: string, value: unknown) => void
  setSavedStateVector: (value: string, sourceRevision?: string | number) => void
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
  sourceRevision?: string | number
}

const CollaborationProvider = ({
  children,
  contentType,
  documentId,
  fieldRootId,
  initialData,
  resource,
  sourceRevision,
}: CollaborationProviderProps) => {
  const client = useManagerClient()
  const { user } = useSession()
  const doc = useMemo(() => new Y.Doc(), [contentType, documentId, resource])
  const localRoomName = useMemo(
    () => getLocalRoomName(resource, contentType, documentId, user?._id),
    [contentType, documentId, resource, user?._id],
  )
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
  const [syncRoom, setSyncRoom] = useState<string | null>(null)
  const savedStateVectorRef = useRef(new Uint8Array())
  const pendingUpdatesRef = useRef<Uint8Array[]>([])
  const initialLocalUpdateRef = useRef<Uint8Array | null>(null)
  const syncPromiseRef = useRef<Promise<void> | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const persistenceRef = useRef<IndexeddbPersistence | null>(null)
  const localReadyRef = useRef(false)
  const networkConnectedRef = useRef(false)
  const sourceRevisionRef = useRef(sourceRevision)

  useEffect(() => {
    sourceRevisionRef.current = sourceRevision
  }, [sourceRevision])

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
    if (!networkConnectedRef.current) {
      setStatus(localReadyRef.current ? 'offline' : 'connecting')
      return
    }
    const dirty = !equalFlat(Y.encodeStateVector(doc), savedStateVectorRef.current)
    writeLocalRoomMetadata(localRoomName, {
      dirty,
      sourceRevision: sourceRevisionRef.current,
    })
    setStatus(dirty ? 'unsaved' : 'synced')
  }, [doc, localRoomName])

  const persistSavedStateVector = useCallback((value: Uint8Array) => {
    const persistence = persistenceRef.current
    if (!persistence) return
    void persistence.set(SAVED_STATE_VECTOR_KEY, toArrayBuffer(value)).catch(() => undefined)
  }, [])

  const exchange = useCallback(async () => {
    if (syncPromiseRef.current) {
      await syncPromiseRef.current
      if (
        pendingUpdatesRef.current.length === 0 &&
        !initialLocalUpdateRef.current
      ) {
        return
      }
    }

    const pending = pendingUpdatesRef.current
    pendingUpdatesRef.current = []
    const initialLocalUpdate = initialLocalUpdateRef.current
    initialLocalUpdateRef.current = null
    const outgoingUpdates = [
      ...(initialLocalUpdate ? [initialLocalUpdate] : []),
      ...pending,
    ]
    const update = outgoingUpdates.length ? Y.mergeUpdates(outgoingUpdates) : undefined
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
        networkConnectedRef.current = true
        const remoteUpdate = decodeBinary(result.update)
        if (remoteUpdate.length) Y.applyUpdate(doc, remoteUpdate, REMOTE_ORIGIN)
        savedStateVectorRef.current = decodeBinary(result.savedStateVector)
        persistSavedStateVector(savedStateVectorRef.current)
        localReadyRef.current = true
        setReady(true)
        setError(null)
        updateStatus()
      })
      .catch((cause) => {
        if (update) pendingUpdatesRef.current.unshift(update)
        networkConnectedRef.current = false
        const nextError = cause instanceof Error ? cause : new Error(String(cause))
        setError(nextError)
        setStatus(localReadyRef.current ? 'offline' : 'error')
        throw cause
      })
      .finally(() => {
        syncPromiseRef.current = null
      })

    syncPromiseRef.current = request
    await request
  }, [
    client,
    contentType,
    doc,
    documentId,
    persistSavedStateVector,
    resource,
    updateStatus,
  ])

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    await exchange()
    while (pendingUpdatesRef.current.length) await exchange()
  }, [exchange])

  useSync({
    key: ['rakun-collaboration', localRoomName],
    topic: createSyncTopic('collaboration', resource, contentType, documentId),
    fetcher: async () => {
      await exchange()
      return null
    },
    enabled: syncRoom === localRoomName,
    initialData: null,
    meta: { suppressErrorToast: true },
    retry: false,
    staleTime: Infinity,
    syncIntervalMs: POLL_INTERVAL_MS,
  })

  useEffect(() => {
    let active = true
    let persistence: IndexeddbPersistence | undefined

    const handleUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === LOCAL_ORIGIN) {
        pendingUpdatesRef.current.push(update)
        writeLocalRoomMetadata(localRoomName, {
          dirty: true,
          sourceRevision: sourceRevisionRef.current,
        })
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

    const initialize = async () => {
      if (typeof globalThis.indexedDB !== 'undefined') {
        try {
          const { clearDocument, IndexeddbPersistence } = await import('y-indexeddb')
          if (!active) return
          const localMetadata = readLocalRoomMetadata(localRoomName)
          if (
            sourceRevisionRef.current !== undefined &&
            localMetadata?.sourceRevision !== undefined &&
            String(sourceRevisionRef.current) !==
              String(localMetadata.sourceRevision) &&
            !localMetadata.dirty
          ) {
            await clearDocument(localRoomName)
            if (!active) return
          }
          persistence = new IndexeddbPersistence(localRoomName, doc)
          persistenceRef.current = persistence
          await persistence.whenSynced
          if (!active) return

          const persistedVector = await persistence
            .get(SAVED_STATE_VECTOR_KEY)
            .catch(() => undefined)
          if (!active) return
          if (persistedVector instanceof ArrayBuffer) {
            savedStateVectorRef.current = new Uint8Array(persistedVector)
          }

          const localSnapshot = getContentSnapshot(doc)
          if (Object.keys(localSnapshot).length > 0) {
            initialLocalUpdateRef.current = Y.encodeStateAsUpdate(doc)
            localReadyRef.current = true
            updateData(localSnapshot)
            setReady(true)
            updateStatus()
          }
        } catch {
          const failedPersistence = persistence
          if (persistenceRef.current === persistence) persistenceRef.current = null
          persistence = undefined
          void failedPersistence?.destroy().catch(() => undefined)
        }
      }

      if (!active) return
      await exchange().catch(() => undefined)
      if (!active) return
      updateData(getContentSnapshot(doc))
      setSyncRoom(localRoomName)
    }

    void initialize()

    return () => {
      active = false
      doc.off('update', handleUpdate)
      if (timerRef.current) clearTimeout(timerRef.current)
      if (pendingUpdatesRef.current.length || initialLocalUpdateRef.current) {
        void flush().catch(() => undefined)
      }
      if (persistenceRef.current === persistence) persistenceRef.current = null
      void persistence?.destroy().catch(() => undefined)
    }
  }, [doc, exchange, flush, localRoomName, updateData, updateStatus])

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
    (value: string, nextSourceRevision?: string | number) => {
      savedStateVectorRef.current = decodeBinary(value)
      networkConnectedRef.current = true
      persistSavedStateVector(savedStateVectorRef.current)
      if (nextSourceRevision !== undefined) {
        sourceRevisionRef.current = nextSourceRevision
      }
      updateStatus()
    },
    [persistSavedStateVector, updateStatus]
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
    sourceRevision={
      typeof initialData._revision === 'string' || typeof initialData._revision === 'number'
        ? initialData._revision
        : undefined
    }
  >
    {children}
  </CollaborationProvider>
)

export const TemplateCollaborationProvider = ({
  children,
  contentType,
  fieldRootId,
  initialData,
  sourceRevision,
}: Omit<CollaborationProviderProps, 'documentId' | 'resource'>) => (
  <CollaborationProvider
    contentType={contentType}
    fieldRootId={fieldRootId}
    initialData={initialData}
    resource="template"
    sourceRevision={sourceRevision}
  >
    {children}
  </CollaborationProvider>
)
