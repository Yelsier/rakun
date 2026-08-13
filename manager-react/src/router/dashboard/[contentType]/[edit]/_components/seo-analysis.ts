import type { SeoAnalysisReport } from '../_hooks/useContentPreview'

export type SeoCheckStatus = 'good' | 'warning' | 'error'

export type SeoCheck = {
  id:
    | 'title'
    | 'description'
    | 'h1'
    | 'headings'
    | 'images'
    | 'canonical'
    | 'language'
    | 'indexing'
    | 'social'
  status: SeoCheckStatus
  value: number
}

const getHeadingSkips = (headings: SeoAnalysisReport['headings']) =>
  headings.reduce((skips, heading, index) => {
    const previousLevel = index === 0 ? 0 : (headings[index - 1]?.level ?? 0)

    return heading.level > previousLevel + 1 ? skips + 1 : skips
  }, 0)

export const buildSeoChecks = (report: SeoAnalysisReport): SeoCheck[] => {
  const titleLength = report.title.length
  const descriptionLength = report.description.length
  const h1Count = report.headings.filter((heading) => heading.level === 1).length
  const headingSkips = getHeadingSkips(report.headings)
  const missingSocialFields = [
    report.openGraph.title,
    report.openGraph.description,
    report.openGraph.image,
  ].filter((value) => !value).length

  return [
    {
      id: 'title',
      status:
        titleLength === 0 ? 'error' : titleLength >= 30 && titleLength <= 60 ? 'good' : 'warning',
      value: titleLength,
    },
    {
      id: 'description',
      status:
        descriptionLength === 0
          ? 'error'
          : descriptionLength >= 120 && descriptionLength <= 160
            ? 'good'
            : 'warning',
      value: descriptionLength,
    },
    {
      id: 'h1',
      status: h1Count === 1 ? 'good' : h1Count === 0 ? 'error' : 'warning',
      value: h1Count,
    },
    {
      id: 'headings',
      status: report.headings.length === 0 || headingSkips > 0 ? 'warning' : 'good',
      value: headingSkips,
    },
    {
      id: 'images',
      status: report.images.missingAlt > 0 ? 'error' : 'good',
      value: report.images.missingAlt,
    },
    {
      id: 'canonical',
      status: report.canonical ? 'good' : 'warning',
      value: report.canonical ? 1 : 0,
    },
    {
      id: 'language',
      status: report.language ? 'good' : 'warning',
      value: report.language ? 1 : 0,
    },
    {
      id: 'indexing',
      status: /(?:^|,)\s*noindex\b/i.test(report.robots) ? 'error' : 'good',
      value: /(?:^|,)\s*noindex\b/i.test(report.robots) ? 0 : 1,
    },
    {
      id: 'social',
      status: missingSocialFields === 0 ? 'good' : 'warning',
      value: missingSocialFields,
    },
  ]
}

export const getSeoScore = (checks: SeoCheck[]) => {
  if (checks.length === 0) return 0

  const points = checks.reduce(
    (total, check) => total + (check.status === 'good' ? 1 : check.status === 'warning' ? 0.5 : 0),
    0
  )

  return Math.round((points / checks.length) * 100)
}
