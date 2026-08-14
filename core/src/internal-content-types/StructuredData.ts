import ContentType from '../lib/ContentType'
import { f } from '../lib/fields'
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
    schemaType: f
      .select(structuredDataSchemaTypes)
      .help('structuredData.schemaTypeHelp')
      .required(),
    name: f.string().translatable().optional(),
    description: f.string().type('Textarea').translatable().optional(),
    url: f.string().type('Url').translatable().optional(),
    image: f.file().type('Image').optional(),
    sku: f.string()
      .condition({ field: 'schemaType', equals: 'Product' })
      .optional(),
    brand: f.string()
      .condition({ field: 'schemaType', equals: 'Product' })
      .optional(),
    price: f.number()
      .condition({ field: 'schemaType', equals: 'Product' })
      .optional(),
    priceCurrency: f.string()
      .condition({ field: 'schemaType', equals: 'Product' })
      .optional(),
    availability: f.select(structuredDataAvailabilities)
      .condition({ field: 'schemaType', equals: 'Product' })
      .optional(),
    itemCondition: f.select(structuredDataItemConditions)
      .condition({ field: 'schemaType', equals: 'Product' })
      .optional(),
    ratingValue: f.number()
      .condition({ field: 'schemaType', equals: 'Product' })
      .optional(),
    reviewCount: f.number()
      .condition({ field: 'schemaType', equals: 'Product' })
      .optional(),
    authorName: f.string()
      .condition({ field: 'schemaType', equals: 'Article' })
      .optional(),
    publisherName: f.string()
      .condition({ field: 'schemaType', equals: 'Article' })
      .optional(),
    datePublished: f.date()
      .type('DateTime')
      .condition({ field: 'schemaType', equals: 'Article' })
      .optional(),
    dateModified: f.date()
      .type('DateTime')
      .condition({ field: 'schemaType', equals: 'Article' })
      .optional(),
    logo: f.file()
      .type('Image')
      .condition({ field: 'schemaType', equals: 'Organization' })
      .optional(),
    breadcrumbs: f.array(f.link())
      .condition({ field: 'schemaType', equals: 'BreadcrumbList' })
      .optional(),
    customJson: f.string()
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
