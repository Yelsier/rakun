'use client'

import { CheckCircle2, CircleX, Search, Share2, TriangleAlert } from 'lucide-react'
import { useState } from 'react'

import ContentTypeEdit from '../ContentTypeEdit'
import { useEditPageContext } from '../_context/EditPageContext'
import { buildSeoChecks, getSeoScore, type SeoCheck } from './seo-analysis'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n'

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

export const SeoTabContent = () => {
  const t = useTranslations()
  const [view, setView] = useState<'metadata' | 'analysis'>('metadata')
  const { canPreview, contentType, contentTypeId, contentTypeName, form, previewState, sections } =
    useEditPageContext()
  const report = previewState.seoAnalysis
  const checks = report ? buildSeoChecks(report) : []
  const score = getSeoScore(checks)

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
              : t('contentEdit.seoSocialMissing', { count: check.value }),
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
      className="min-h-full gap-5"
    >
      <TabsList>
        <TabsTrigger value="metadata">{t('contentEdit.seoMetadataView')}</TabsTrigger>
        <TabsTrigger value="analysis">{t('contentEdit.seoAnalysisView')}</TabsTrigger>
      </TabsList>

      <TabsContent value="metadata" forceMount hidden={view !== 'metadata'} className="min-h-0">
        <ContentTypeEdit
          key={`seo:${form.formRevision}`}
          defaultData={form.draft.current}
          ref={form.seoRef}
          contentType={sections.seo}
          parentContentType={contentType}
          initializeSeoBindings={!contentTypeId}
          id={contentTypeName}
          hideTitle
        />
      </TabsContent>

      <TabsContent
        value="analysis"
        forceMount
        hidden={view !== 'analysis'}
        className="space-y-5 pb-6"
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
                !canPreview || previewState.isPreviewPending || previewState.isSeoAnalysisPending
              }
              loading={previewState.isSeoAnalysisPending}
              onClick={() => void previewState.handleSeoAnalysis()}
            >
              <Search />
              {report ? t('contentEdit.seoRegenerateReport') : t('contentEdit.seoGenerateReport')}
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

        {!report ? (
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
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>
  )
}
