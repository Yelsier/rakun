import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { ContentTypeRouteMeta } from '../edit.types'

import { useManagerMutation } from '@/client/react'
import type { ManagerPreviewConfig } from '@/router/shared/types'

type UseContentPreviewParams = {
  canPreview: boolean
  contentTypeName: string
  contentTypeId?: string
  languageCode: string
  preview?: ManagerPreviewConfig
  previewRoute?: ContentTypeRouteMeta
  readFormData: (options?: { showSaveError?: boolean }) => unknown | undefined
}

const defaultPreviewTokenParam = 'rakun_preview'
const previewUpdateMessageType = 'rakun:preview:update'
const previewReadyMessageType = 'rakun:preview:ready'

type PreviewUpdateMessage = {
  type: typeof previewUpdateMessageType
  href: string
  path: string
  token: string
  tokenParam: string
}

const buildPreviewFrameUrl = ({
  preview,
  path,
  token,
}: {
  preview: ManagerPreviewConfig
  path: string
  token: string
}) => {
  const baseUrl = new URL(preview.webBaseUrl.toString(), window.location.origin)
  const baseHref = baseUrl.href.endsWith('/') ? baseUrl.href : `${baseUrl.href}/`
  const url = new URL(path.replace(/^\/+/, ''), baseHref)

  url.searchParams.set(preview.tokenParam ?? defaultPreviewTokenParam, token)

  return url.toString()
}

export const useContentPreview = ({
  canPreview,
  contentTypeName,
  contentTypeId,
  languageCode,
  preview,
  previewRoute,
  readFormData,
}: UseContentPreviewParams) => {
  const { mutateAsync: createPreview, isPending: isPreviewPending } = useManagerMutation(
    'manager.preview.create',
  )
  const previewFrameRef = useRef<HTMLIFrameElement>(null)
  const previewRequestId = useRef(0)
  const previewBridgeReady = useRef(false)
  const previewBridgeFallbackTimeout = useRef<number | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const clearPreviewBridgeFallback = useCallback(() => {
    if (!previewBridgeFallbackTimeout.current) return

    window.clearTimeout(previewBridgeFallbackTimeout.current)
    previewBridgeFallbackTimeout.current = null
  }, [])

  const schedulePreviewBridgeFallback = useCallback(
    (href: string) => {
      clearPreviewBridgeFallback()

      previewBridgeFallbackTimeout.current = window.setTimeout(() => {
        previewBridgeFallbackTimeout.current = null

        if (previewBridgeReady.current) return

        setPreviewUrl(href)
      }, 1500)
    },
    [clearPreviewBridgeFallback],
  )

  const postPreviewUpdateMessage = useCallback(
    (message: PreviewUpdateMessage) => {
      if (!preview) return false
      if (!previewBridgeReady.current) return false

      const frameWindow = previewFrameRef.current?.contentWindow

      if (!frameWindow) return false

      const targetOrigin = new URL(preview.webBaseUrl.toString(), window.location.origin).origin

      frameWindow.postMessage(message, targetOrigin)

      return true
    },
    [preview],
  )

  const updatePreviewFrame = useCallback(
    ({
      forceUrl = false,
      path,
      token,
    }: {
      forceUrl?: boolean
      path: string
      token: string
    }) => {
      if (!preview) return

      const href = buildPreviewFrameUrl({
        preview,
        path,
        token,
      })
      const message = {
        type: previewUpdateMessageType,
        href,
        path,
        token,
        tokenParam: preview.tokenParam ?? defaultPreviewTokenParam,
      } satisfies PreviewUpdateMessage

      if (!forceUrl && postPreviewUpdateMessage(message)) {
        previewBridgeReady.current = false
        schedulePreviewBridgeFallback(href)
        return
      }

      previewBridgeReady.current = false
      clearPreviewBridgeFallback()
      setPreviewUrl(href)
    },
    [clearPreviewBridgeFallback, postPreviewUpdateMessage, preview, schedulePreviewBridgeFallback],
  )

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== previewFrameRef.current?.contentWindow) return
      if (preview) {
        const targetOrigin = new URL(preview.webBaseUrl.toString(), window.location.origin).origin

        if (event.origin !== targetOrigin) return
      }
      if (
        !event.data ||
        typeof event.data !== 'object' ||
        (event.data as { type?: unknown }).type !== previewReadyMessageType
      ) {
        return
      }

      previewBridgeReady.current = true
      clearPreviewBridgeFallback()
    }

    window.addEventListener('message', handleMessage)

    return () => window.removeEventListener('message', handleMessage)
  }, [clearPreviewBridgeFallback, preview])

  useEffect(() => clearPreviewBridgeFallback, [clearPreviewBridgeFallback])

  const handlePreview = useCallback(async () => {
    if (!preview || !previewRoute) return

    const data = readFormData()

    if (!data) return

    setPreviewOpen(true)
    setPreviewError(null)

    const requestId = ++previewRequestId.current

    try {
      const result = await createPreview({
        contentType: contentTypeName,
        documentId: contentTypeId,
        data,
        languageCode,
        routeKey: previewRoute.key,
      })

      if (requestId !== previewRequestId.current) return

      updatePreviewFrame({
        forceUrl: !previewOpen || !previewUrl,
        path: result.path,
        token: result.token,
      })
    } catch {
      if (requestId !== previewRequestId.current) return

      setPreviewError('Preview could not be loaded')
      toast.error('Preview could not be loaded')
    }
  }, [
    contentTypeId,
    contentTypeName,
    createPreview,
    languageCode,
    preview,
    previewOpen,
    previewRoute,
    previewUrl,
    readFormData,
    updatePreviewFrame,
  ])

  useEffect(() => {
    if (!canPreview && previewOpen) {
      setPreviewOpen(false)
    }
  }, [canPreview, previewOpen])

  return {
    handlePreview,
    isPreviewPending,
    previewError,
    previewFrameRef,
    previewOpen,
    previewUrl,
    setPreviewOpen,
  }
}
