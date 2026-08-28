import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useTranslations } from '@/i18n'
import { useSession } from '@/state/session'

import type { ContentTypeRouteMeta } from '../edit.types'
import { buildSeoChecks, getSeoScore } from '../_components/seo-analysis'

import { useManagerMutation } from '@/client/react'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import type { ManagerPreviewConfig } from '@/router/shared/types'

type UseContentPreviewParams = {
  canPreview: boolean
  contentTypeName: string
  contentTypeId?: string
  languageCode: string
  onModuleSelect?: (message: PreviewModuleSelectMessage) => void
  preview?: ManagerPreviewConfig
  previewRoute?: ContentTypeRouteMeta
  readFormData: (options?: { showSaveError?: boolean }) => unknown | undefined
  readTemplateModules?: () => unknown[] | undefined
}

const defaultPreviewTokenParam = 'rakun_preview'
const previewUpdateMessageType = 'rakun:preview:update'
const previewReadyMessageType = 'rakun:preview:ready'
const previewModuleSelectMessageType = 'rakun:preview:select-module'
const previewInspectorMessageType = 'rakun:preview:inspect-mode'
const previewSeoAnalysisMessageType = 'rakun:preview:seo-analysis'
const previewSeoAnalysisResultMessageType = 'rakun:preview:seo-analysis-result'

type PreviewUpdateMessage = {
  type: typeof previewUpdateMessageType
  href: string
  path: string
  token: string
  tokenParam: string
}

type PreviewInspectorMessage = {
  type: typeof previewInspectorMessageType
  enabled: boolean
}

export type PreviewModuleSelectMessage = {
  type: typeof previewModuleSelectMessageType
  entryType: 'content' | 'layout' | 'template'
  moduleId: string
  moduleType: string
  index: number
  layoutIndex: number
  layoutKey?: string
  moduleIndex?: number
}

export type SeoAnalysisReport = {
  url: string
  title: string
  description: string
  canonical: string
  siteUrl: string
  robots: string
  language: string
  headings: Array<{ level: number; text: string }>
  images: { total: number; missingAlt: number; emptyAlt: number }
  structuredData: Array<{
    raw: string
    valid: boolean
    hasContext: boolean
    types: string[]
    error: string
  }>
  openGraph: {
    title: string
    description: string
    image: string
    url: string
    type: string
  }
  twitter: {
    card: string
    title: string
    description: string
    image: string
  }
}

const readSeoAnalysisReport = (value: unknown): SeoAnalysisReport | null => {
  if (!value || typeof value !== 'object') return null

  const report = value as SeoAnalysisReport
  const structuredData = report.structuredData ?? []
  const strings = [
    report.url,
    report.title,
    report.description,
    report.canonical,
    report.siteUrl,
    report.robots,
    report.language,
  ]

  if (strings.some((item) => typeof item !== 'string')) return null
  if (!Array.isArray(report.headings)) return null
  if (
    !Array.isArray(structuredData) ||
    structuredData.some(
      (item) =>
        !item ||
        typeof item.raw !== 'string' ||
        typeof item.valid !== 'boolean' ||
        typeof item.hasContext !== 'boolean' ||
        !Array.isArray(item.types) ||
        typeof item.error !== 'string'
    )
  ) {
    return null
  }
  if (!report.images || typeof report.images.total !== 'number') return null
  if (!report.openGraph || typeof report.openGraph.title !== 'string') return null
  if (!report.twitter || typeof report.twitter.title !== 'string') return null

  return { ...report, structuredData }
}

const readNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const readPreviewModuleSelectMessage = (
  value: unknown,
): PreviewModuleSelectMessage | null => {
  if (!value || typeof value !== 'object') return null

  const message = value as Record<string, unknown>

  if (message.type !== previewModuleSelectMessageType) return null
  if (
    message.entryType !== 'content' &&
    message.entryType !== 'layout' &&
    message.entryType !== 'template'
  ) {
    return null
  }
  if (typeof message.moduleId !== 'string') return null
  if (typeof message.moduleType !== 'string') return null

  const index = readNumber(message.index)
  const layoutIndex = readNumber(message.layoutIndex)

  if (index === undefined || layoutIndex === undefined) return null

  const layoutKey = typeof message.layoutKey === 'string' ? message.layoutKey : undefined
  const moduleIndex = readNumber(message.moduleIndex)

  return {
    type: previewModuleSelectMessageType,
    entryType: message.entryType,
    moduleId: message.moduleId,
    moduleType: message.moduleType,
    index,
    layoutIndex,
    layoutKey,
    moduleIndex,
  }
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
  onModuleSelect,
  preview,
  previewRoute,
  readFormData,
  readTemplateModules,
}: UseContentPreviewParams) => {
  const t = useTranslations()
  const tRef = useRef(t)
  tRef.current = t
  const { mutateAsync: createPreview, isPending: isPreviewPending } = useManagerMutation(
    'manager.preview.create',
  )
  const { mutateAsync: saveSeoAudit } = useManagerMutation('manager.create')
  const { hasPermissions } = useSession()
  const canSaveSeoAudit = hasPermissions(['content.SeoSettings.own'])
  const previewFrameRef = useRef<HTMLIFrameElement>(null)
  const previewRequestId = useRef(0)
  const previewBridgeReady = useRef(false)
  const previewBridgeFallbackTimeout = useRef<number | null>(null)
  const seoAnalysisRequestId = useRef(0)
  const pendingSeoAnalysisRequestId = useRef<number | null>(null)
  const seoAnalysisTimeout = useRef<number | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewInspectorEnabled, setPreviewInspectorEnabled] = useState(false)
  const [seoAnalysis, setSeoAnalysis] = useState<SeoAnalysisReport | null>(null)
  const [seoAnalysisError, setSeoAnalysisError] = useState<string | null>(null)
  const [isSeoAnalysisPending, setIsSeoAnalysisPending] = useState(false)
  const [seoAnalysisHistoryRevision, setSeoAnalysisHistoryRevision] = useState(0)

  const clearSeoAnalysisTimeout = useCallback(() => {
    if (!seoAnalysisTimeout.current) return

    window.clearTimeout(seoAnalysisTimeout.current)
    seoAnalysisTimeout.current = null
  }, [])

  const failSeoAnalysis = useCallback(
    (message: string) => {
      pendingSeoAnalysisRequestId.current = null
      clearSeoAnalysisTimeout()
      setIsSeoAnalysisPending(false)
      setSeoAnalysisError(message)
      toast.error(message)
    },
    [clearSeoAnalysisTimeout],
  )

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

  const postPreviewInspectorMessage = useCallback(
    (enabled: boolean) => {
      if (!preview) return false
      if (!previewBridgeReady.current) return false

      const frameWindow = previewFrameRef.current?.contentWindow

      if (!frameWindow) return false

      const targetOrigin = new URL(preview.webBaseUrl.toString(), window.location.origin).origin

      frameWindow.postMessage(
        {
          type: previewInspectorMessageType,
          enabled,
        } satisfies PreviewInspectorMessage,
        targetOrigin,
      )

      return true
    },
    [preview],
  )

  const postSeoAnalysisMessage = useCallback(() => {
    if (!preview || !previewBridgeReady.current) return false

    const requestId = pendingSeoAnalysisRequestId.current
    const frameWindow = previewFrameRef.current?.contentWindow

    if (requestId === null || !frameWindow) return false

    const targetOrigin = new URL(preview.webBaseUrl.toString(), window.location.origin).origin

    frameWindow.postMessage(
      {
        type: previewSeoAnalysisMessageType,
        requestId,
      },
      targetOrigin,
    )

    return true
  }, [preview])

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
      if (preview) {
        const targetOrigin = new URL(preview.webBaseUrl.toString(), window.location.origin).origin

        if (event.origin !== targetOrigin) return
      }
      if (event.source !== previewFrameRef.current?.contentWindow) return

      const selectMessage = readPreviewModuleSelectMessage(event.data)

      if (selectMessage) {
        if (!preview) return
        if (!previewInspectorEnabled) return

        onModuleSelect?.(selectMessage)
        setPreviewInspectorEnabled(false)
        return
      }

      if (
        event.data &&
        typeof event.data === 'object' &&
        (event.data as { type?: unknown }).type === previewSeoAnalysisResultMessageType
      ) {
        const message = event.data as { requestId?: unknown; report?: unknown }

        if (message.requestId !== pendingSeoAnalysisRequestId.current) return

        const report = readSeoAnalysisReport(message.report)

        if (!report) {
          failSeoAnalysis(tRef.current('contentEdit.seoAnalysisInvalidResponse'))
          return
        }

        pendingSeoAnalysisRequestId.current = null
        clearSeoAnalysisTimeout()
        setSeoAnalysis(report)
        setSeoAnalysisError(null)
        setIsSeoAnalysisPending(false)

        if (canSaveSeoAudit && contentTypeId && previewRoute) {
          const checks = buildSeoChecks(report)
          const score = getSeoScore(checks)

          void saveSeoAudit({
            contentType: 'SeoAudit',
            data: {
              _type: 'SeoAudit',
              kind: 'page',
              languageCode,
              score,
              goodCount: checks.filter((check) => check.status === 'good').length,
              warningCount: checks.filter((check) => check.status === 'warning').length,
              errorCount: checks.filter((check) => check.status === 'error').length,
              documentCount: 1,
              contentTypeCount: 1,
              contentType: contentTypeName,
              documentId: contentTypeId,
              routeKey: previewRoute.key,
              url: report.canonical || undefined,
              payload: JSON.stringify({
                version: 1,
                report: {
                  ...report,
                  url: report.canonical || report.siteUrl,
                },
                checks,
              }),
            },
          })
            .then(() => setSeoAnalysisHistoryRevision((revision) => revision + 1))
            .catch(() => {
              toast.error(tRef.current('contentEdit.seoAnalysisSaveError'))
            })
        }
        return
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
      postPreviewInspectorMessage(previewInspectorEnabled)
      postSeoAnalysisMessage()
    }

    window.addEventListener('message', handleMessage)

    return () => window.removeEventListener('message', handleMessage)
  }, [
    clearPreviewBridgeFallback,
    clearSeoAnalysisTimeout,
    canSaveSeoAudit,
    contentTypeId,
    contentTypeName,
    failSeoAnalysis,
    onModuleSelect,
    postPreviewInspectorMessage,
    postSeoAnalysisMessage,
    preview,
    previewInspectorEnabled,
    previewRoute,
    languageCode,
    saveSeoAudit,
  ])

  useEffect(() => clearPreviewBridgeFallback, [clearPreviewBridgeFallback])

  useEffect(() => clearSeoAnalysisTimeout, [clearSeoAnalysisTimeout])

  useEffect(() => {
    postPreviewInspectorMessage(previewInspectorEnabled)
  }, [postPreviewInspectorMessage, previewInspectorEnabled])

  const handlePreview = useCallback(async () => {
    if (!preview || !previewRoute) return false

    const data = readFormData()
    const templateModules = readTemplateModules?.()

    if (!data || (readTemplateModules && !templateModules)) return false

    setPreviewOpen(true)
    setPreviewError(null)

    const requestId = ++previewRequestId.current

    try {
      const result = await createPreview({
        contentType: contentTypeName,
        documentId: contentTypeId,
        data,
        templateModules,
        languageCode,
        routeKey: previewRoute.key,
      })

      if (requestId !== previewRequestId.current) return true

      updatePreviewFrame({
        forceUrl: !previewOpen || !previewUrl,
        path: result.path,
        token: result.token,
      })
      return true
    } catch {
      if (requestId !== previewRequestId.current) return true

      setPreviewError(t('contentEdit.previewCouldNotLoad'))
      toast.error(t('contentEdit.previewCouldNotLoad'))
      return true
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
    readTemplateModules,
    t,
    updatePreviewFrame,
  ])

  const handleSeoAnalysis = useCallback(async () => {
    if (!preview || !previewRoute) return

    const data = readFormData()
    const templateModules = readTemplateModules?.()

    if (!data || (readTemplateModules && !templateModules)) return

    setIsSeoAnalysisPending(true)
    setSeoAnalysisError(null)
    clearSeoAnalysisTimeout()

    const requestId = ++previewRequestId.current

    try {
      const result = await createPreview({
        contentType: contentTypeName,
        documentId: contentTypeId,
        data,
        templateModules,
        languageCode,
        routeKey: previewRoute.key,
      })

      if (requestId !== previewRequestId.current) return

      const analysisRequestId = ++seoAnalysisRequestId.current

      pendingSeoAnalysisRequestId.current = analysisRequestId
      seoAnalysisTimeout.current = window.setTimeout(
        () => failSeoAnalysis(t('contentEdit.seoAnalysisTimeout')),
        10000,
      )
      updatePreviewFrame({
        forceUrl: !previewOpen,
        path: result.path,
        token: result.token,
      })
    } catch (error) {
      if (requestId !== previewRequestId.current) return

      failSeoAnalysis(
        getActionErrorMessage(error, t('contentEdit.seoAnalysisPreviewError')),
      )
    }
  }, [
    clearSeoAnalysisTimeout,
    contentTypeId,
    contentTypeName,
    createPreview,
    failSeoAnalysis,
    languageCode,
    preview,
    previewOpen,
    previewRoute,
    readFormData,
    readTemplateModules,
    t,
    updatePreviewFrame,
  ])

  useEffect(() => {
    if (!canPreview && previewOpen) {
      setPreviewOpen(false)
    }

    if (!canPreview || !previewOpen) {
      setPreviewInspectorEnabled(false)
    }
  }, [canPreview, previewOpen])

  return {
    handlePreview,
    handleSeoAnalysis,
    isPreviewPending,
    isSeoAnalysisPending,
    previewError,
    previewFrameRef,
    previewInspectorEnabled,
    previewOpen,
    previewUrl,
    seoAnalysis,
    seoAnalysisError,
    seoAnalysisHistoryRevision,
    setPreviewInspectorEnabled,
    setPreviewOpen,
  }
}
