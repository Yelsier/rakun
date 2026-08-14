'use client'

import type { EncodedContentType, Permission } from '@rakun-kit/core/client'
import {
  AlertTriangle,
  CheckCircle2,
  CircleX,
  History,
  SearchCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  buildSiteSeoAudit,
  getSiteSeoAuditCounts,
  type SiteSeoAuditPayload,
  type SiteSeoFinding,
} from './site-analysis'

import { useManagerClient, useManagerMutation, useManagerQuery } from '@/client/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Loading from '@/components/loading'
import { PaginationController } from '@/components/PaginationController'
import UnauthorizedMessage from '@/components/unauthorized'
import { formatDate } from '@/helpers/formatDate'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { useTranslations } from '@/i18n'
import { ManagerLink } from '@/link'
import { cn } from '@/lib/utils'
import { getEncodedContentPermissions } from '@/state/permissions'
import { useLanguage } from '@/state/language'
import { useSession } from '@/state/session'

const SEO_AUDIT_CONTENT_TYPE = 'SeoAudit'
const SEO_HISTORY_PAGE_SIZE = 10

type SeoAuditRecord = {
  _id: string
  kind: 'site' | 'page'
  languageCode: string
  score: number
  goodCount: number
  warningCount: number
  errorCount: number
  documentCount: number
  contentTypeCount: number
  contentType?: string
  documentId?: string
  url?: string
  payload: string
  createdAt?: Date | string
}

const scoreStyles = (score: number) =>
  score >= 80
    ? 'text-emerald-700 dark:text-emerald-300'
    : score >= 50
      ? 'text-amber-700 dark:text-amber-300'
      : 'text-destructive'

const parsePayload = (value: string): SiteSeoAuditPayload | null => {
  try {
    const payload = JSON.parse(value) as SiteSeoAuditPayload
    return payload?.version === 1 && Array.isArray(payload.pages) ? payload : null
  } catch {
    return null
  }
}

export const ManagerSeoScreen = ({
  contentTypes,
  siteUrl,
}: {
  contentTypes: EncodedContentType[]
  siteUrl?: string
}) => {
  const t = useTranslations()
  const managerClient = useManagerClient()
  const { getTranslation, language } = useLanguage()
  const { hasAnyPermission, hasPermissions } = useSession()
  const [currentPayload, setCurrentPayload] = useState<SiteSeoAuditPayload | null>(null)
  const [siteHistoryPage, setSiteHistoryPage] = useState(1)
  const [pageHistoryPage, setPageHistoryPage] = useState(1)
  const canRead = hasAnyPermission([
    'content.SeoSettings.own' as Permission,
    'content.SeoSettings.readAny' as Permission,
  ])
  const canCreate = hasPermissions(['content.SeoSettings.own' as Permission])
  const createAudit = useManagerMutation('manager.create')
  const siteHistoryQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: SEO_AUDIT_CONTENT_TYPE,
      query: {
        filter: { kind: 'site', languageCode: language.code },
        options: {
          limit: SEO_HISTORY_PAGE_SIZE,
          page: siteHistoryPage,
          sort: { createdAt: 'desc' },
        },
      },
    },
    enabled: canRead,
  })
  const latestSiteAuditQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: SEO_AUDIT_CONTENT_TYPE,
      query: {
        filter: { kind: 'site', languageCode: language.code },
        options: { limit: 1, page: 1, sort: { createdAt: 'desc' } },
      },
    },
    enabled: canRead,
  })
  const pageHistoryQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: SEO_AUDIT_CONTENT_TYPE,
      query: {
        filter: { kind: 'page', languageCode: language.code },
        options: {
          limit: SEO_HISTORY_PAGE_SIZE,
          page: pageHistoryPage,
          sort: { createdAt: 'desc' },
        },
      },
    },
    enabled: canRead,
  })
  const siteHistory = (siteHistoryQuery.data?.items ?? []) as SeoAuditRecord[]
  const latestSiteAudit = (latestSiteAuditQuery.data?.items?.[0] ?? null) as SeoAuditRecord | null
  const pageHistory = (pageHistoryQuery.data?.items ?? []) as SeoAuditRecord[]
  const displayedPayload = currentPayload ?? parsePayload(latestSiteAudit?.payload ?? '')
  const displayedCounts = displayedPayload ? getSiteSeoAuditCounts(displayedPayload) : null
  const routableContentTypes = useMemo(
    () =>
      contentTypes.filter((contentType) => {
        if (!contentType.routes?.some((route) => route.hasPage)) return false

        const permissions = getEncodedContentPermissions(contentType, ['own', 'readAny'])
        return permissions.length === 0 || hasAnyPermission(permissions)
      }),
    [contentTypes, hasAnyPermission],
  )

  useEffect(() => {
    setSiteHistoryPage(1)
    setPageHistoryPage(1)
    setCurrentPayload(null)
  }, [language.code])

  const getFindingCopy = (finding: SiteSeoFinding) => {
    switch (finding.code) {
      case 'missingTitle':
        return t('seoAudit.finding.missingTitle')
      case 'titleLength':
        return t('seoAudit.finding.titleLength')
      case 'missingDescription':
        return t('seoAudit.finding.missingDescription')
      case 'descriptionLength':
        return t('seoAudit.finding.descriptionLength')
      case 'noIndex':
        return t('seoAudit.finding.noIndex')
      case 'missingCanonicalBase':
        return t('seoAudit.finding.missingCanonicalBase')
      case 'incompleteOpenGraph':
        return t('seoAudit.finding.incompleteOpenGraph', {
          fields: finding.fields?.join(', ') ?? '',
        })
      case 'duplicateTitle':
        return t('seoAudit.finding.duplicateTitle')
      case 'duplicateDescription':
        return t('seoAudit.finding.duplicateDescription')
    }
  }

  const runAudit = async () => {
    try {
      const contents = await Promise.all(
        routableContentTypes.map(async (contentType) => {
          const result = await managerClient.request('manager.list', {
            contentType: contentType.name,
            languageCode: language.code,
            query: { options: { limit: 'all' } },
          })

          return {
            contentType: contentType.name,
            documentVisibility: contentType.documentVisibility,
            documents: result.items,
          }
        }),
      )
      const payload = buildSiteSeoAudit({
        contents,
        resolveValue: (value) => {
          if (value === undefined || value === null) return value
          try {
            return getTranslation(value as never)
          } catch {
            return value
          }
        },
        siteUrl,
      })
      const counts = getSiteSeoAuditCounts(payload)

      await createAudit.mutateAsync({
        contentType: SEO_AUDIT_CONTENT_TYPE,
        data: {
          _type: SEO_AUDIT_CONTENT_TYPE,
          kind: 'site',
          languageCode: language.code,
          score: counts.score,
          goodCount: counts.goodCount,
          warningCount: counts.warningCount,
          errorCount: counts.errorCount,
          documentCount: payload.pages.length,
          contentTypeCount: routableContentTypes.length,
          payload: JSON.stringify(payload),
        },
      })

      setCurrentPayload(payload)
      setSiteHistoryPage(1)
      await Promise.all([siteHistoryQuery.refetch(), latestSiteAuditQuery.refetch()])
      toast.success(t('seoAudit.generated'))
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('seoAudit.generateError')))
    }
  }

  if (!canRead) {
    return (
      <UnauthorizedMessage
        neededPermission={[
          'content.SeoSettings.own' as Permission,
          'content.SeoSettings.readAny' as Permission,
        ]}
        anyPermission
      />
    )
  }

  if (
    siteHistoryQuery.isLoading ||
    latestSiteAuditQuery.isLoading ||
    pageHistoryQuery.isLoading
  ) {
    return <Loading />
  }

  return (
    <div className='container mx-auto flex flex-col gap-6 px-4 py-10'>
      <Card>
        <CardHeader className='gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='space-y-1.5'>
            <CardTitle className='flex items-center gap-2'>
              <SearchCheck className='size-5' />
              {t('seoAudit.title')}
            </CardTitle>
            <CardDescription>{t('seoAudit.description')}</CardDescription>
          </div>
          <Button
            className='shrink-0'
            disabled={!canCreate || routableContentTypes.length === 0}
            loading={createAudit.isPending}
            onClick={() => void runAudit()}
          >
            <SearchCheck />
            {(siteHistoryQuery.data?.totalItems ?? 0) > 0
              ? t('seoAudit.regenerate')
              : t('seoAudit.generate')}
          </Button>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          {t('seoAudit.scope', { count: routableContentTypes.length })}
        </CardContent>
      </Card>

      {displayedPayload && displayedCounts ? (
        <>
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            <Card>
              <CardContent className='pt-6'>
                <p className='text-sm text-muted-foreground'>{t('seoAudit.score')}</p>
                <p className={cn('mt-2 text-4xl font-semibold', scoreStyles(displayedCounts.score))}>
                  {displayedCounts.score}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='pt-6'>
                <p className='text-sm text-muted-foreground'>{t('seoAudit.documents')}</p>
                <p className='mt-2 text-4xl font-semibold'>{displayedPayload.pages.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='pt-6'>
                <p className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <CircleX className='size-4 text-destructive' />
                  {t('seoAudit.errors')}
                </p>
                <p className='mt-2 text-4xl font-semibold'>{displayedCounts.errorCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='pt-6'>
                <p className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <AlertTriangle className='size-4 text-amber-500' />
                  {t('seoAudit.warnings')}
                </p>
                <p className='mt-2 text-4xl font-semibold'>{displayedCounts.warningCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('seoAudit.pagesTitle')}</CardTitle>
              <CardDescription>{t('seoAudit.pagesDescription')}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {displayedPayload.pages
                .slice()
                .sort((a, b) => b.findings.length - a.findings.length)
                .map((page) => (
                  <details key={`${page.contentType}:${page.documentId}`} className='rounded-lg border'>
                    <summary className='flex cursor-pointer list-none items-center gap-3 p-4'>
                      {page.findings.some((finding) => finding.severity === 'error') ? (
                        <CircleX className='size-4 shrink-0 text-destructive' />
                      ) : page.findings.length ? (
                        <AlertTriangle className='size-4 shrink-0 text-amber-500' />
                      ) : (
                        <CheckCircle2 className='size-4 shrink-0 text-emerald-500' />
                      )}
                      <span className='min-w-0 flex-1 truncate font-medium'>{page.label}</span>
                      <Badge variant='outline'>{page.contentType}</Badge>
                      <Badge variant={page.findings.length ? 'secondary' : 'outline'}>
                        {t('seoAudit.issueCount', { count: page.findings.length })}
                      </Badge>
                    </summary>
                    <div className='border-t p-4'>
                      {page.findings.length ? (
                        <ul className='space-y-2 text-sm'>
                          {page.findings.map((finding, index) => (
                            <li key={`${finding.code}:${index}`} className='flex items-start gap-2'>
                              {finding.severity === 'error' ? (
                                <CircleX className='mt-0.5 size-4 shrink-0 text-destructive' />
                              ) : (
                                <AlertTriangle className='mt-0.5 size-4 shrink-0 text-amber-500' />
                              )}
                              {getFindingCopy(finding)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className='text-sm text-muted-foreground'>{t('seoAudit.noIssues')}</p>
                      )}
                      <ManagerLink
                        href={`/${page.contentType}/${page.documentId}`}
                        className='mt-4 inline-flex text-sm font-medium text-primary hover:underline'
                      >
                        {t('seoAudit.openDocument')}
                      </ManagerLink>
                    </div>
                  </details>
                ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className='flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center text-muted-foreground'>
          <SearchCheck className='size-9' />
          <div>
            <p className='font-medium text-foreground'>{t('seoAudit.emptyTitle')}</p>
            <p className='mt-1 max-w-lg text-sm'>{t('seoAudit.emptyDescription')}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <History className='size-4' />
            {t('seoAudit.historyTitle')}
          </CardTitle>
          <CardDescription>{t('seoAudit.historyDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {siteHistory.length ? (
            <div className='space-y-4'>
              <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                {siteHistory.map((audit) => (
                  <div key={audit._id} className='rounded-lg border p-4'>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-sm text-muted-foreground'>
                        {audit.createdAt
                          ? formatDate(new Date(audit.createdAt))
                          : t('common.unknown')}
                      </span>
                      <strong className={scoreStyles(audit.score)}>
                        {t('seoAudit.scoreValue', { score: audit.score })}
                      </strong>
                    </div>
                    <div className='mt-3 h-2 overflow-hidden rounded-full bg-muted'>
                      <div
                        className='h-full rounded-full bg-primary'
                        style={{ width: `${Math.max(0, Math.min(100, audit.score))}%` }}
                      />
                    </div>
                    <p className='mt-3 text-xs text-muted-foreground'>
                      {t('seoAudit.historySummary', {
                        documents: audit.documentCount,
                        errors: audit.errorCount,
                        warnings: audit.warningCount,
                      })}
                    </p>
                  </div>
                ))}
              </div>
              {(siteHistoryQuery.data?.totalItems ?? 0) > SEO_HISTORY_PAGE_SIZE ? (
                <PaginationController
                  page={siteHistoryPage}
                  setPage={setSiteHistoryPage}
                  totalItems={siteHistoryQuery.data?.totalItems ?? 0}
                  itemsPerPage={SEO_HISTORY_PAGE_SIZE}
                />
              ) : null}
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>{t('seoAudit.noHistory')}</p>
          )}
        </CardContent>
      </Card>

      {pageHistory.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('seoAudit.pageHistoryTitle')}</CardTitle>
            <CardDescription>{t('seoAudit.pageHistoryDescription')}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              {pageHistory.map((audit) => (
                <div
                  key={audit._id}
                  className='flex flex-wrap items-center gap-3 rounded-lg border p-3'
                >
                  <strong className={cn('w-12', scoreStyles(audit.score))}>{audit.score}</strong>
                  <span className='min-w-0 flex-1 truncate text-sm'>
                    {audit.contentType ?? t('common.unknown')}
                  </span>
                  <span className='text-xs text-muted-foreground'>
                    {audit.createdAt
                      ? formatDate(new Date(audit.createdAt))
                      : t('common.unknown')}
                  </span>
                  {audit.contentType && audit.documentId ? (
                    <ManagerLink
                      href={`/${audit.contentType}/${audit.documentId}`}
                      className='text-sm font-medium text-primary hover:underline'
                    >
                      {t('seoAudit.openDocument')}
                    </ManagerLink>
                  ) : null}
                </div>
              ))}
            </div>
            {(pageHistoryQuery.data?.totalItems ?? 0) > SEO_HISTORY_PAGE_SIZE ? (
              <PaginationController
                page={pageHistoryPage}
                setPage={setPageHistoryPage}
                totalItems={pageHistoryQuery.data?.totalItems ?? 0}
                itemsPerPage={SEO_HISTORY_PAGE_SIZE}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
