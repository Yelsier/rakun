export type SiteSeoFindingSeverity = 'warning' | 'error'

export type SiteSeoFindingCode =
  | 'missingTitle'
  | 'titleLength'
  | 'missingDescription'
  | 'defaultDescription'
  | 'descriptionLength'
  | 'noIndex'
  | 'missingCanonicalBase'
  | 'incompleteOpenGraph'
  | 'duplicateTitle'
  | 'duplicateDescription'

export type SiteSeoFinding = {
  code: SiteSeoFindingCode
  severity: SiteSeoFindingSeverity
  fields?: string[]
}

export type SiteSeoAuditPage = {
  contentType: string
  documentId: string
  label: string
  title: string
  description: string
  findings: SiteSeoFinding[]
}

export type SiteSeoAuditPayload = {
  version: 1
  pages: SiteSeoAuditPage[]
}

type SiteSeoDocument = Record<string, unknown> & {
  _id: string
}

type SiteSeoContent = {
  contentType: string
  documentVisibility?: boolean
  documents: SiteSeoDocument[]
}

const normalizeComparable = (value: string) => value.trim().toLocaleLowerCase()

const readString = (
  value: unknown,
  resolveValue: (value: unknown) => unknown,
) => {
  if (typeof value === 'string') return value.trim()

  const resolved = resolveValue(value)
  return typeof resolved === 'string' ? resolved.trim() : ''
}

const getSeo = (document: SiteSeoDocument) =>
  document._seo && typeof document._seo === 'object'
    ? (document._seo as Record<string, unknown>)
    : {}

const getPathValue = (value: unknown, path: string) =>
  path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[segment]
  }, value)

const readSeoString = ({
  contentType,
  document,
  field,
  resolveValue,
  seo,
}: {
  contentType: string
  document: SiteSeoDocument
  field: string
  resolveValue: (value: unknown) => unknown
  seo: Record<string, unknown>
}) => {
  const direct = readString(seo[field], resolveValue)
  if (direct) return direct

  const bindings =
    seo._bindings && typeof seo._bindings === 'object'
      ? (seo._bindings as Record<string, unknown>)
      : null
  const fields =
    bindings?.fields && typeof bindings.fields === 'object'
      ? (bindings.fields as Record<string, unknown>)
      : null
  const binding =
    fields?.[field] && typeof fields[field] === 'object'
      ? (fields[field] as Record<string, unknown>)
      : null

  if (
    binding?.contentType !== contentType ||
    binding.id ||
    typeof binding.path !== 'string'
  ) {
    return ''
  }

  return readString(getPathValue(document, binding.path), resolveValue)
}

const hasSeoBinding = (seo: Record<string, unknown>, field: string) => {
  if (!seo._bindings || typeof seo._bindings !== 'object') return false

  const fields = (seo._bindings as Record<string, unknown>).fields
  return Boolean(
    fields &&
      typeof fields === 'object' &&
      (fields as Record<string, unknown>)[field],
  )
}

const addDuplicateFindings = (
  pages: SiteSeoAuditPage[],
  field: 'title' | 'description',
  code: 'duplicateTitle' | 'duplicateDescription',
  severity: SiteSeoFindingSeverity,
) => {
  const groups = new Map<string, SiteSeoAuditPage[]>()

  for (const page of pages) {
    const value = normalizeComparable(page[field])
    if (!value) continue

    const group = groups.get(value) ?? []
    group.push(page)
    groups.set(value, group)
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue

    for (const page of group) {
      page.findings.push({ code, severity })
    }
  }
}

export const buildSiteSeoAudit = ({
  contents,
  defaultDescription,
  resolveValue,
  siteUrl,
}: {
  contents: SiteSeoContent[]
  defaultDescription?: unknown
  resolveValue: (value: unknown) => unknown
  siteUrl?: string
}): SiteSeoAuditPayload => {
  const resolvedDefaultDescription = readString(defaultDescription, resolveValue)
  const pages = contents.flatMap((content) =>
    content.documents.flatMap((document) => {
      if (content.documentVisibility && document._visibility !== 'published') {
        return []
      }

      const seo = getSeo(document)
      const title = readSeoString({
        contentType: content.contentType,
        document,
        field: 'title',
        resolveValue,
        seo,
      })
      const pageDescription = readSeoString({
        contentType: content.contentType,
        document,
        field: 'description',
        resolveValue,
        seo,
      })
      const usesDefaultDescription =
        !pageDescription && Boolean(resolvedDefaultDescription)
      const description = pageDescription || resolvedDefaultDescription
      const hasTitleBinding = hasSeoBinding(seo, 'title')
      const hasDescriptionBinding = hasSeoBinding(seo, 'description')
      const canonical = readString(seo.canonicalUrl, resolveValue)
      const findings: SiteSeoFinding[] = []

      if (!title && !hasTitleBinding) {
        findings.push({ code: 'missingTitle', severity: 'error' })
      } else if (title.length < 30 || title.length > 60) {
        if (title) findings.push({ code: 'titleLength', severity: 'warning' })
      }

      if (usesDefaultDescription) {
        findings.push({ code: 'defaultDescription', severity: 'warning' })
      } else if (!description && !hasDescriptionBinding) {
        findings.push({ code: 'missingDescription', severity: 'error' })
      } else if (description.length < 120 || description.length > 160) {
        if (description) {
          findings.push({ code: 'descriptionLength', severity: 'warning' })
        }
      }

      if (seo.noIndex === true) {
        findings.push({ code: 'noIndex', severity: 'warning' })
      }

      if (!canonical && !siteUrl?.trim()) {
        findings.push({ code: 'missingCanonicalBase', severity: 'error' })
      }

      if (seo.customOpenGraph === true) {
        const missingFields = [
          ['title', seo.openGraphTitle],
          ['description', seo.openGraphDescription],
          ['image', seo.openGraphImage],
        ]
          .filter(([, value]) => !value)
          .map(([field]) => field as string)

        if (missingFields.length > 0) {
          findings.push({
            code: 'incompleteOpenGraph',
            severity: 'warning',
            fields: missingFields,
          })
        }
      }

      return [
        {
          contentType: content.contentType,
          documentId: document._id,
          label: title || `${content.contentType} ${document._id.slice(-6)}`,
          title,
          description,
          findings,
        },
      ]
    }),
  )

  addDuplicateFindings(pages, 'title', 'duplicateTitle', 'error')
  addDuplicateFindings(
    pages,
    'description',
    'duplicateDescription',
    'warning',
  )

  return { version: 1, pages }
}

export const getSiteSeoAuditCounts = (payload: SiteSeoAuditPayload) => {
  const errorCount = payload.pages.reduce(
    (total, page) =>
      total + page.findings.filter((finding) => finding.severity === 'error').length,
    0,
  )
  const warningCount = payload.pages.reduce(
    (total, page) =>
      total + page.findings.filter((finding) => finding.severity === 'warning').length,
    0,
  )
  const totalChecks = Math.max(payload.pages.length * 4, errorCount + warningCount)
  const goodCount = Math.max(0, totalChecks - errorCount - warningCount)
  const score = totalChecks
    ? Math.max(
        0,
        Math.round(((goodCount + warningCount * 0.5) / totalChecks) * 100),
      )
    : 0

  return { errorCount, goodCount, score, warningCount }
}
