import ContentType from '../lib/ContentType'
import { Fields } from '../lib/fields'
import type { DataFront, DataInput, DBOutput } from '../lib/types'

const structuredDataSchemaTypes = [
  'Product',
  'Article',
  'Organization',
  'WebSite',
  'BreadcrumbList',
  'Custom',
] as const

const structuredDataAvailabilities = [
  'InStock',
  'OutOfStock',
  'PreOrder',
  'BackOrder',
  'Discontinued',
] as const

const structuredDataItemConditions = [
  'NewCondition',
  'UsedCondition',
  'RefurbishedCondition',
  'DamagedCondition',
] as const

export const StructuredData = new ContentType({
  name: 'StructuredData',
  modulePicker: {
    title: 'structuredData.moduleTitle',
    description: 'structuredData.moduleDescription',
    category: 'structuredData.moduleCategory',
    icon: 'Braces',
    keywords: ['JSON-LD', 'schema.org', 'SEO'],
  },
  fields: {
    schemaType: Fields.select(structuredDataSchemaTypes).required(),
    name: Fields.string().translatable().optional(),
    description: Fields.string().type('Textarea').translatable().optional(),
    url: Fields.string().type('Url').translatable().optional(),
    image: Fields.file().type('Image').optional(),
    sku: Fields.string()
      .condition({ field: 'schemaType', equals: 'Product' })
      .optional(),
    brand: Fields.string()
      .condition({ field: 'schemaType', equals: 'Product' })
      .optional(),
    price: Fields.number()
      .condition({ field: 'schemaType', equals: 'Product' })
      .optional(),
    priceCurrency: Fields.string()
      .condition({ field: 'schemaType', equals: 'Product' })
      .optional(),
    availability: Fields.select(structuredDataAvailabilities)
      .condition({ field: 'schemaType', equals: 'Product' })
      .optional(),
    itemCondition: Fields.select(structuredDataItemConditions)
      .condition({ field: 'schemaType', equals: 'Product' })
      .optional(),
    ratingValue: Fields.number()
      .condition({ field: 'schemaType', equals: 'Product' })
      .optional(),
    reviewCount: Fields.number()
      .condition({ field: 'schemaType', equals: 'Product' })
      .optional(),
    authorName: Fields.string()
      .condition({ field: 'schemaType', equals: 'Article' })
      .optional(),
    publisherName: Fields.string()
      .condition({ field: 'schemaType', equals: 'Article' })
      .optional(),
    datePublished: Fields.date()
      .type('DateTime')
      .condition({ field: 'schemaType', equals: 'Article' })
      .optional(),
    dateModified: Fields.date()
      .type('DateTime')
      .condition({ field: 'schemaType', equals: 'Article' })
      .optional(),
    logo: Fields.file()
      .type('Image')
      .condition({ field: 'schemaType', equals: 'Organization' })
      .optional(),
    breadcrumbs: Fields.array(Fields.link())
      .condition({ field: 'schemaType', equals: 'BreadcrumbList' })
      .optional(),
    customJson: Fields.string()
      .type('Textarea')
      .translatable()
      .description('structuredData.customJsonDescription')
      .condition({ field: 'schemaType', equals: 'Custom' })
      .optional(),
  },
  listFields: ['schemaType', 'name'],
}).hideFromManager()

export type StructuredData = typeof StructuredData
export type StructuredDataSchema = DataFront<StructuredData>
export type StructuredDataInput = DataInput<StructuredData>
export type StructuredDataManager = DBOutput<StructuredData>
