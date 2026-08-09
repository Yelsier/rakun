import { SEO_FIELD_NAME } from '@rakun-kit/core/client'
import type {
  DynamicDocumentBindings,
  EncodedContentType,
  EncodedFieldUnknown,
  EncodedRelationField,
} from '@rakun-kit/core/client'

const isDynamicField = (field: EncodedFieldUnknown) =>
  (field.visibility ?? 'all') === 'all' && field.isDynamic !== false

export const getInitialSeoBindings = ({
  contentType,
  parentContentType,
}: {
  contentType: EncodedContentType
  parentContentType?: EncodedContentType
}): DynamicDocumentBindings | undefined => {
  if (!parentContentType || parentContentType.dynamicData === false) return undefined

  const seoRelation = parentContentType.fields[SEO_FIELD_NAME]
  if (
    seoRelation?.config.type !== 'Relation' ||
    (seoRelation as EncodedRelationField).contentType.name !== contentType.name ||
    contentType.dynamicData === false
  ) {
    return undefined
  }

  const fields = Object.entries(parentContentType.fields).reduce<
    NonNullable<DynamicDocumentBindings['fields']>
  >((bindings, [sourceName, sourceField]) => {
    const seoField = sourceField.config.seo
    const targetField = typeof seoField === 'string' ? contentType.fields[seoField] : undefined

    if (
      typeof seoField !== 'string' ||
      sourceField.config.type !== 'String' ||
      sourceField.config.ui === 'RichText' ||
      !isDynamicField(sourceField) ||
      targetField?.config.type !== 'String' ||
      !isDynamicField(targetField) ||
      bindings[seoField]
    ) {
      return bindings
    }

    bindings[seoField] = {
      contentType: parentContentType.name,
      path: sourceName,
    }
    return bindings
  }, {})

  return Object.keys(fields).length > 0 ? { fields } : undefined
}
