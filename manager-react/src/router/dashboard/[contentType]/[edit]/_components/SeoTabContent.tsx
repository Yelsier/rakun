'use client'

import type { Permission } from '@rakun-kit/core/client'
import {
  Braces,
  CheckCircle2,
  CircleX,
  History,
  RotateCcw,
  Search,
  Share2,
  Tags,
  TriangleAlert,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import ContentTypeEdit from '../ContentTypeEdit'
import { useEditPageContext } from '../_context/EditPageContext'
import { buildSeoChecks, getSeoScore, type SeoCheck } from './seo-analysis'
import type { SeoAnalysisReport } from '../_hooks/useContentPreview'

import { useManagerQuery } from '@/client/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n'
import { formatDate } from '@/helpers/formatDate'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { useSession } from '@/state/session'

const statusStyles = {
  good: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
  warning: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
  error: 'border-destructive/30 bg-destructive/5 text-destructive',
} as const

const StatusIcon = ({ status }: { status: SeoCheck['status'] }) => {
  if (status === 'good') return <CheckCircle2 className="size-4" />
  if (status === 'warning') return <TriangleAlert className="size-4" />

  return <CircleX className="size-4" />
}

const getDisplayUrl = (value: string) => {
  try {
    const url = new URL(value)
    return `${url.host}${url.pathname}`
  } catch {
    return value
  }
}

const formatJsonLd = (value: string) => {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

type PageSeoAuditRecord = {
  _id: string
  score: number
  goodCount: number
  warningCount: number
  errorCount: number
  payload: string
  createdAt?: Date | string
}

type PageSeoAuditSnapshot = {
  report: SeoAnalysisReport | null
  checks: SeoCheck[]
}

const readSavedReport = (value: unknown): SeoAnalysisReport | null => {
  if (!value || typeof value !== 'object') return null

  const report = value as SeoAnalysisReport

  if (
    typeof report.url !== 'string' ||
    typeof report.title !== 'string' ||
    typeof report.description !== 'string' ||
    typeof report.canonical !== 'string' ||
    typeof report.siteUrl !== 'string' ||
    typeof report.robots !== 'string' ||
    typeof report.language !== 'string' ||
    !Array.isArray(report.headings) ||
    !report.images ||
    !Array.isArray(report.structuredData) ||
    !report.openGraph ||
    !report.twitter
  ) {
    return null
  }

  return report
}

const readSavedChecks = (value: unknown): SeoCheck[] => {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []

    const check = item as SeoCheck
    if (
      typeof check.id !== 'string' ||
      !['good', 'warning', 'error'].includes(check.status) ||
      typeof check.value !== 'number'
    ) {
      return []
    }

    return [check]
  })
}

const readPageSeoAuditSnapshot = (payload: string): PageSeoAuditSnapshot => {
  try {
    const value = JSON.parse(payload) as { report?: unknown; checks?: unknown }
    return {
      report: readSavedReport(value.report),
      checks: readSavedChecks(value.checks),
    }
  } catch {
    return { report: null, checks: [] }
  }
}

export const SeoTabContent = () => {
  const t = useTranslations()
  const [view, setView] = useState<'metadata' | 'analysis'>('metadata')
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null)
  const {
    canPreview,
    contentType,
    contentTypeId,
    contentTypeName,
    form,
    languageCode,
    localeVariantRoute,
    previewState,
    sections,
  } = useEditPageContext()
  const { hasAnyPermission } = useSession()
  const canReadHistory = hasAnyPermission([
    'content.SeoSettings.own' as Permission,
    'content.SeoSettings.readAny' as Permission,
  ])
  const historyQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: 'SeoAudit',
      query: {
        filter: {
          kind: 'page',
          contentType: contentTypeName,
          documentId: contentTypeId ?? '',
          languageCode,
          ...(localeVariantRoute ? { routeKey: localeVariantRoute.key } : {}),
        },
        options: { limit: 20, sort: { createdAt: 'desc' } },
      },
    },
    enabled: Boolean(canReadHistory && contentTypeId),
  })
  const history = (historyQuery.data?.items ?? []) as PageSeoAuditRecord[]
  const selectedAudit = history.find((audit) => audit._id === selectedAuditId)
  const selectedSnapshot = useMemo(
    () => (selectedAudit ? readPageSeoAuditSnapshot(selectedAudit.payload) : null),
    [selectedAudit]
  )
  const liveReport = previewState.seoAnalysis
  const report = selectedAudit ? (selectedSnapshot?.report ?? null) : liveReport
  const checks = selectedAudit
    ? (selectedSnapshot?.checks ?? [])
    : report
      ? buildSeoChecks(report)
      : []
  const score = selectedAudit?.score ?? getSeoScore(checks)

  useEffect(() => {
    setSelectedAuditId(null)
  }, [liveReport])

  useEffect(() => {
    setSelectedAuditId(null)
  }, [contentTypeId, languageCode, localeVariantRoute?.key])

  useEffect(() => {
    if (previewState.seoAnalysisHistoryRevision === 0) return
    void historyQuery.refetch()
  }, [historyQuery.refetch, previewState.seoAnalysisHistoryRevision])
  const missingSocialFields = [
    [report?.openGraph.title, t('contentEdit.seoSocialFieldTitle')],
    [report?.openGraph.description, t('contentEdit.seoSocialFieldDescription')],
    [report?.openGraph.image, t('contentEdit.seoSocialFieldImage')],
  ]
    .filter(([value]) => !value)
    .map(([, label]) => label)

  const getCheckCopy = (check: SeoCheck) => {
    switch (check.id) {
      case 'title':
        return {
          title: t('contentEdit.seoCheckTitle'),
          description:
            check.status === 'error'
              ? t('contentEdit.seoTitleMissing')
              : check.status === 'good'
                ? t('contentEdit.seoTitleGood', { count: check.value })
                : t('contentEdit.seoTitleImprove', { count: check.value }),
        }
      case 'description':
        return {
          title: t('contentEdit.seoCheckDescription'),
          description:
            check.status === 'error'
              ? t('contentEdit.seoDescriptionMissing')
              : check.status === 'good'
                ? t('contentEdit.seoDescriptionGood', { count: check.value })
                : t('contentEdit.seoDescriptionImprove', { count: check.value }),
        }
      case 'h1':
        return {
          title: t('contentEdit.seoCheckH1'),
          description:
            check.value === 1
              ? t('contentEdit.seoH1Good')
              : check.value === 0
                ? t('contentEdit.seoH1Missing')
                : t('contentEdit.seoH1Multiple', { count: check.value }),
        }
      case 'headings':
        return {
          title: t('contentEdit.seoCheckHeadings'),
          description: !report?.headings.length
            ? t('contentEdit.seoHeadingsMissing')
            : check.value === 0
              ? t('contentEdit.seoHeadingsGood')
              : t('contentEdit.seoHeadingsSkipped', { count: check.value }),
        }
      case 'images':
        return {
          title: t('contentEdit.seoCheckImages'),
          description:
            check.value === 0
              ? t('contentEdit.seoImagesGood', { count: report?.images.total ?? 0 })
              : t('contentEdit.seoImagesMissingAlt', { count: check.value }),
        }
      case 'canonical':
        return {
          title: t('contentEdit.seoCheckCanonical'),
          description: report?.canonical
            ? t('contentEdit.seoCanonicalGood')
            : report?.siteUrl
              ? t('contentEdit.seoCanonicalMissing')
              : t('contentEdit.seoCanonicalSiteUrlMissing'),
        }
      case 'language':
        return {
          title: t('contentEdit.seoCheckLanguage'),
          description: report?.language
            ? t('contentEdit.seoLanguageGood', { language: report.language })
            : t('contentEdit.seoLanguageMissing'),
        }
      case 'indexing':
        return {
          title: t('contentEdit.seoCheckIndexing'),
          description:
            check.status === 'good'
              ? t('contentEdit.seoIndexingGood')
              : t('contentEdit.seoIndexingBlocked'),
        }
      case 'social':
        return {
          title: t('contentEdit.seoCheckSocial'),
          description:
            check.value === 0
              ? t('contentEdit.seoSocialGood')
              : t('contentEdit.seoSocialMissing', {
                  fields: missingSocialFields.join(', '),
                }),
        }
      case 'structuredData':
        return {
          title: t('contentEdit.seoCheckStructuredData'),
          description:
            report?.structuredData.length === 0
              ? t('contentEdit.seoStructuredDataNone')
              : check.status === 'good'
                ? t('contentEdit.seoStructuredDataGood', {
                    count: report?.structuredData.length ?? 0,
                  })
                : t('contentEdit.seoStructuredDataInvalid', { count: check.value }),
        }
    }
  }

  const socialTitle = report?.openGraph.title || report?.twitter.title || report?.title || ''
  const socialDescription =
    report?.openGraph.description || report?.twitter.description || report?.description || ''
  const socialImage = report?.openGraph.image || report?.twitter.image || ''
  const resultUrl = report?.canonical || report?.url || ''

  return (
    <Tabs
      value={view}
      onValueChange={(value) => {
        form.saveState()
        setView(value as 'metadata' | 'analysis')
      }}
      className="h-full min-h-0 gap-0 overflow-hidden"
    >
      <TabsList
        variant="line"
        className="flex items-center justify-start gap-4 flex-row! w-full border-b px-5.5 py-2 h-12.25!"
      >
        <TabsTrigger
          value="metadata"
          className="-mb-px h-8 w-auto! flex-none justify-center! rounded-none border-x-0 border-t-0 border-b-2 border-b-transparent px-0 py-0 after:hidden data-[state=active]:border-b-primary! dark:data-[state=active]:border-b-primary!"
        >
          <Tags />
          {t('contentEdit.seoMetadataView')}
        </TabsTrigger>
        <TabsTrigger
          value="analysis"
          className="-mb-px h-8 w-auto! flex-none justify-center! rounded-none border-x-0 border-t-0 border-b-2 border-b-transparent px-0 py-0 after:hidden data-[state=active]:border-b-primary! dark:data-[state=active]:border-b-primary!"
        >
          <Search />
          {t('contentEdit.seoAnalysisView')}
        </TabsTrigger>
      </TabsList>

      <div hidden={view !== 'metadata'} className="min-h-0 flex-1 px-4 py-4 pr-2 md:px-5 md:pr-3">
        <ScrollArea asChild>
          <TabsContent
            value="metadata"
            forceMount
            hidden={view !== 'metadata'}
            className="h-full min-h-0 pr-2"
          >
            <ContentTypeEdit
              key={`seo:${form.formRevision}`}
              defaultData={form.draft.current}
              ref={form.seoRef}
              contentType={sections.seo}
              parentContentType={contentType}
              initializeSeoBindings={!contentTypeId}
              id={contentTypeName}
              hideTitle
              collaborative
            />
          </TabsContent>
        </ScrollArea>
      </div>

      <div hidden={view !== 'analysis'} className="min-h-0 flex-1 px-4 py-4 pr-2 md:px-5 md:pr-3">
        <ScrollArea asChild>
          <TabsContent
            value="analysis"
            forceMount
            hidden={view !== 'analysis'}
            className="h-full min-h-0 space-y-5 pr-2"
          >
            <Card>
              <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <CardTitle>{t('contentEdit.seoAnalysisTitle')}</CardTitle>
                  <CardDescription>{t('contentEdit.seoAnalysisDescription')}</CardDescription>
                </div>
                <Button
                  className="shrink-0"
                  disabled={
                    !canPreview ||
                    previewState.isPreviewPending ||
                    previewState.isSeoAnalysisPending
                  }
                  loading={previewState.isSeoAnalysisPending}
                  onClick={() => void previewState.handleSeoAnalysis()}
                >
                  <Search />
                  {liveReport
                    ? t('contentEdit.seoRegenerateReport')
                    : t('contentEdit.seoGenerateReport')}
                </Button>
              </CardHeader>
              {!canPreview ? (
                <CardContent className="text-muted-foreground text-sm">
                  {t('contentEdit.seoAnalysisUnavailable')}
                </CardContent>
              ) : null}
              {previewState.seoAnalysisError ? (
                <CardContent className="text-destructive text-sm">
                  {previewState.seoAnalysisError}
                </CardContent>
              ) : null}
            </Card>

            {contentTypeId && canReadHistory ? (
              <Card>
                <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                      <History className="size-4" />
                      {t('contentEdit.seoHistoryTitle')}
                    </CardTitle>
                    <CardDescription>{t('contentEdit.seoHistoryDescription')}</CardDescription>
                  </div>
                  {selectedAudit ? (
                    <Button variant="outline" size="sm" onClick={() => setSelectedAuditId(null)}>
                      <RotateCcw />
                      {t('contentEdit.seoHistoryCurrent')}
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent>
                  {historyQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">
                      {t('contentEdit.seoHistoryLoading')}
                    </p>
                  ) : historyQuery.isError ? (
                    <p className="text-sm text-destructive">
                      {getActionErrorMessage(
                        historyQuery.error,
                        t('contentEdit.seoHistoryLoadError')
                      )}
                    </p>
                  ) : history.length ? (
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {history.map((audit) => (
                        <button
                          key={audit._id}
                          type="button"
                          className={cn(
                            'min-w-48 rounded-lg border p-3 text-left transition-colors hover:bg-accent',
                            selectedAuditId === audit._id && 'border-primary bg-primary/5'
                          )}
                          onClick={() => setSelectedAuditId(audit._id)}
                        >
                          <span className="block text-xs text-muted-foreground">
                            {audit.createdAt
                              ? formatDate(new Date(audit.createdAt))
                              : t('common.unknown')}
                          </span>
                          <span className="mt-2 flex items-center justify-between gap-3">
                            <strong>
                              {t('contentEdit.seoHistoryScore', { score: audit.score })}
                            </strong>
                            <span className="flex gap-1">
                              {audit.errorCount ? (
                                <Badge variant="destructive">{audit.errorCount}</Badge>
                              ) : null}
                              {audit.warningCount ? (
                                <Badge variant="secondary">{audit.warningCount}</Badge>
                              ) : null}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('contentEdit.seoHistoryEmpty')}
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {selectedAudit ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                <History className="size-4 text-primary" />
                <span className="font-medium">{t('contentEdit.seoHistoryViewing')}</span>
                <span className="text-muted-foreground">
                  {selectedAudit.createdAt
                    ? formatDate(new Date(selectedAudit.createdAt))
                    : t('common.unknown')}
                </span>
              </div>
            ) : null}

            {!report && selectedAudit && checks.length ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t('contentEdit.seoHistorySnapshotTitle')}</CardTitle>
                  <CardDescription>
                    {t('contentEdit.seoHistorySnapshotDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {checks.map((check) => {
                    const copy = getCheckCopy(check)

                    return (
                      <div
                        key={check.id}
                        className={cn('rounded-lg border p-4', statusStyles[check.status])}
                      >
                        <div className="flex items-center gap-2 font-medium">
                          <StatusIcon status={check.status} />
                          {copy.title}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ) : !report ? (
              <div className="text-muted-foreground flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
                <Search className="size-9" />
                <div>
                  <p className="font-medium text-foreground">{t('contentEdit.seoNoReportTitle')}</p>
                  <p className="mt-1 max-w-lg text-sm">{t('contentEdit.seoNoReportDescription')}</p>
                </div>
              </div>
            ) : (
              <>
                <Card>
                  <CardContent className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-center">
                    <div
                      className={cn(
                        'flex size-24 shrink-0 items-center justify-center rounded-full border-8 text-2xl font-semibold',
                        score >= 80
                          ? statusStyles.good
                          : score >= 50
                            ? statusStyles.warning
                            : statusStyles.error
                      )}
                    >
                      {score}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{t('contentEdit.seoScoreTitle')}</h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {t('contentEdit.seoScoreDescription')}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(['good', 'warning', 'error'] as const).map((status) => (
                          <Badge key={status} variant="outline" className={statusStyles[status]}>
                            <StatusIcon status={status} />
                            {t(
                              `contentEdit.seoStatus${status === 'good' ? 'Good' : status === 'warning' ? 'Warning' : 'Error'}`
                            )}
                            {' · '}
                            {checks.filter((check) => check.status === status).length}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {checks.map((check) => {
                    const copy = getCheckCopy(check)

                    return (
                      <div
                        key={check.id}
                        className={cn('rounded-lg border p-4', statusStyles[check.status])}
                      >
                        <div className="flex items-center gap-2 font-medium">
                          <StatusIcon status={check.status} />
                          {copy.title}
                        </div>
                        <p className="mt-2 text-sm text-foreground/75">{copy.description}</p>
                      </div>
                    )
                  })}
                </div>

                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]">
                  <div className="grid gap-5">
                    <Card className="overflow-hidden">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Search className="size-4" />
                          {t('contentEdit.seoGooglePreview')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-lg border bg-white p-5 text-slate-900 shadow-sm">
                          <p className="truncate text-sm text-emerald-800">
                            {getDisplayUrl(resultUrl)}
                          </p>
                          <p className="mt-1 line-clamp-1 text-xl text-blue-800">{report.title}</p>
                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
                            {report.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="overflow-hidden">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Share2 className="size-4" />
                          {t('contentEdit.seoSocialPreview')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-hidden rounded-lg border bg-muted/30">
                          {socialImage ? (
                            <img
                              src={socialImage}
                              alt=""
                              className="aspect-[1.91/1] w-full bg-muted object-cover"
                            />
                          ) : null}
                          <div className="space-y-1 p-4">
                            <p className="text-muted-foreground truncate text-xs uppercase">
                              {getDisplayUrl(report.openGraph.url || report.url)}
                            </p>
                            <p className="line-clamp-1 font-semibold">{socialTitle}</p>
                            <p className="text-muted-foreground line-clamp-2 text-sm">
                              {socialDescription}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-5">
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('contentEdit.seoHeadingOutline')}</CardTitle>
                        <CardDescription>
                          {t('contentEdit.seoHeadingCount', { count: report.headings.length })}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="xl:max-h-[36rem] xl:overflow-y-auto">
                        {report.headings.length ? (
                          <ol className="space-y-2">
                            {report.headings.map((heading, index) => (
                              <li
                                key={`${heading.level}:${index}`}
                                className="flex min-w-0 items-center gap-3 text-sm"
                                style={{
                                  paddingInlineStart: `${Math.max(0, heading.level - 1) * 1.25}rem`,
                                }}
                              >
                                <Badge variant="outline">
                                  {t('contentEdit.seoHeadingLevel', { level: heading.level })}
                                </Badge>
                                <span className="truncate">
                                  {heading.text || t('contentEdit.seoEmptyHeading')}
                                </span>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            {t('contentEdit.seoHeadingsMissing')}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Braces className="size-4" />
                          {t('contentEdit.seoStructuredDataTitle')}
                        </CardTitle>
                        <CardDescription>
                          {t('contentEdit.seoStructuredDataCount', {
                            count: report.structuredData.length,
                          })}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {report.structuredData.length ? (
                          <div className="space-y-3">
                            {report.structuredData.map((item, index) => {
                              const issues = [
                                !item.valid ? t('contentEdit.seoStructuredDataInvalidJson') : null,
                                item.valid && !item.hasContext
                                  ? t('contentEdit.seoStructuredDataMissingContext')
                                  : null,
                                item.valid && item.types.length === 0
                                  ? t('contentEdit.seoStructuredDataMissingType')
                                  : null,
                              ].filter(Boolean) as string[]
                              const valid = issues.length === 0

                              return (
                                <div key={index} className="rounded-lg border p-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className={valid ? statusStyles.good : statusStyles.error}
                                    >
                                      <StatusIcon status={valid ? 'good' : 'error'} />
                                      {valid
                                        ? t('contentEdit.seoStructuredDataValid')
                                        : t('contentEdit.seoStructuredDataNeedsAttention')}
                                    </Badge>
                                    {item.types.map((type) => (
                                      <Badge key={type} variant="secondary">
                                        {type}
                                      </Badge>
                                    ))}
                                  </div>
                                  {issues.length ? (
                                    <ul className="mt-3 space-y-1 text-sm text-destructive">
                                      {issues.map((issue) => (
                                        <li key={issue}>{issue}</li>
                                      ))}
                                      {!item.valid && item.error ? (
                                        <li className="font-mono text-xs">{item.error}</li>
                                      ) : null}
                                    </ul>
                                  ) : null}
                                  <details className="mt-3">
                                    <summary className="text-muted-foreground cursor-pointer text-sm">
                                      {t('contentEdit.seoStructuredDataViewJson')}
                                    </summary>
                                    <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                                      {formatJsonLd(item.raw)}
                                    </pre>
                                  </details>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            {t('contentEdit.seoStructuredDataNone')}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </ScrollArea>
      </div>
    </Tabs>
  )
}
