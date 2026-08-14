import ContentType from '../lib/ContentType'
import { Fields } from '../lib/fields'
import type { DBOutput } from '../lib/types'

export const SeoAudit = new ContentType({
  name: 'SeoAudit',
  permissions: 'SeoSettings',
  fields: {
    kind: Fields.select(['site', 'page']).required(),
    languageCode: Fields.string().required(),
    score: Fields.number().required(),
    goodCount: Fields.number().required(),
    warningCount: Fields.number().required(),
    errorCount: Fields.number().required(),
    documentCount: Fields.number().required(),
    contentTypeCount: Fields.number().required(),
    contentType: Fields.string().optional(),
    documentId: Fields.string().type('Id').optional(),
    routeKey: Fields.string().optional(),
    url: Fields.string().type('Url').optional(),
    payload: Fields.string().type('Textarea').required(),
  },
  listFields: ['kind', 'score', 'languageCode'],
}).hideFromManager()

export type SeoAudit = typeof SeoAudit
export type SeoAuditManager = DBOutput<SeoAudit>
