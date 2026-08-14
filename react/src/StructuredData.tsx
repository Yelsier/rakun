type JsonLdRecord = Record<string, unknown>

export type StructuredDataProps = {
  schemaType?:
    | 'Product'
    | 'Article'
    | 'Organization'
    | 'WebSite'
    | 'BreadcrumbList'
    | 'Custom'
  name?: string
  description?: string
  url?: string
  image?: unknown
  sku?: string
  brand?: string
  price?: number
  priceCurrency?: string
  availability?: string
  itemCondition?: string
  ratingValue?: number
  reviewCount?: number
  authorName?: string
  publisherName?: string
  datePublished?: string | Date
  dateModified?: string | Date
  logo?: unknown
  breadcrumbs?: Array<{ title?: string; href?: string }>
  customJson?: string
}

const getImageUrl = (value: unknown) => {
  if (!value || typeof value !== 'object' || !('url' in value)) return undefined

  return typeof value.url === 'string' && value.url ? value.url : undefined
}

const getDateValue = (value: string | Date | undefined) => {
  if (!value) return undefined
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString()

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

const compactJsonLd = (value: unknown): unknown => {
  if (value === undefined || value === null || value === '') return undefined

  if (Array.isArray(value)) {
    const items = value.map(compactJsonLd).filter((item) => item !== undefined)
    return items.length ? items : undefined
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as JsonLdRecord).flatMap(([key, item]) => {
      const compacted = compactJsonLd(item)
      return compacted === undefined ? [] : [[key, compacted] as const]
    })

    return entries.length ? Object.fromEntries(entries) : undefined
  }

  return value
}

const schemaUrl = (value: string | undefined) =>
  value ? `https://schema.org/${value}` : undefined

export const buildStructuredData = (props: StructuredDataProps): unknown => {
  const common = {
    '@context': 'https://schema.org',
    '@type': props.schemaType,
    name: props.name,
    description: props.description,
    url: props.url,
    image: getImageUrl(props.image),
  }

  switch (props.schemaType) {
    case 'Product':
      return compactJsonLd({
        ...common,
        sku: props.sku,
        brand: props.brand ? { '@type': 'Brand', name: props.brand } : undefined,
        offers:
          props.price !== undefined ||
          props.priceCurrency ||
          props.availability ||
          props.itemCondition
            ? {
                '@type': 'Offer',
                url: props.url,
                price: props.price,
                priceCurrency: props.priceCurrency,
                availability: schemaUrl(props.availability),
                itemCondition: schemaUrl(props.itemCondition),
              }
            : undefined,
        aggregateRating:
          props.ratingValue !== undefined || props.reviewCount !== undefined
            ? {
                '@type': 'AggregateRating',
                ratingValue: props.ratingValue,
                reviewCount: props.reviewCount,
              }
            : undefined,
      })
    case 'Article':
      return compactJsonLd({
        ...common,
        headline: props.name,
        author: props.authorName
          ? { '@type': 'Person', name: props.authorName }
          : undefined,
        publisher: props.publisherName
          ? { '@type': 'Organization', name: props.publisherName }
          : undefined,
        datePublished: getDateValue(props.datePublished),
        dateModified: getDateValue(props.dateModified),
      })
    case 'Organization':
      return compactJsonLd({
        ...common,
        logo: getImageUrl(props.logo),
      })
    case 'WebSite':
      return compactJsonLd(common)
    case 'BreadcrumbList':
      return compactJsonLd({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: props.breadcrumbs?.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.title,
          item: item.href,
        })),
      })
    case 'Custom':
      if (!props.customJson?.trim()) return undefined

      try {
        return JSON.parse(props.customJson)
      } catch {
        return undefined
      }
    default:
      return undefined
  }
}

export const serializeJsonLd = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')

const serializeInvalidJsonLd = (value: string) =>
  value.replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')

export function StructuredData(props: StructuredDataProps) {
  const data = buildStructuredData(props)
  const invalidCustomJson =
    props.schemaType === 'Custom' && props.customJson?.trim() && data === undefined
      ? props.customJson
      : undefined

  if (invalidCustomJson) {
    return (
      <script
        data-rakun-json-ld-invalid=""
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeInvalidJsonLd(invalidCustomJson) }}
      />
    )
  }

  if (data === undefined) return null

  return (
    <script
      data-rakun-json-ld=""
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
