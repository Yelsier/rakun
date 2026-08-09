import { describe, expect, test } from 'bun:test'
import type {
  EncodedContentType,
  EncodedFieldUnknown,
  EncodedRelationField,
} from '@rakun-kit/core/client'

import { getInitialSeoBindings } from './seoBindings'

const stringField = (seo?: string) =>
  ({
    config: { type: 'String', ui: 'Text', seo },
    isRequired: false,
    isTranslatable: false,
    visibility: 'all',
    isDynamic: true,
  }) as EncodedFieldUnknown

const seo = {
  name: 'Seo',
  uniques: [],
  fields: {
    title: stringField(),
    description: stringField(),
  },
} as EncodedContentType

const seoRelation = {
  config: { type: 'Relation', ui: 'ContentType' },
  contentType: seo,
  isRequired: false,
  isTranslatable: false,
  visibility: 'all',
  isDynamic: true,
} as EncodedRelationField

describe('initial SEO bindings', () => {
  test('links configured string fields to the current document', () => {
    const category = {
      name: 'Category',
      uniques: [],
      fields: {
        title: stringField('title'),
        summary: stringField('description'),
        _seo: seoRelation,
      },
    } as EncodedContentType

    expect(
      getInitialSeoBindings({ contentType: seo, parentContentType: category }),
    ).toEqual({
      fields: {
        title: { contentType: 'Category', path: 'title' },
        description: { contentType: 'Category', path: 'summary' },
      },
    })
  })

  test('does not initialize disabled or unrelated bindings', () => {
    const category = {
      name: 'Category',
      uniques: [],
      dynamicData: false,
      fields: {
        title: stringField('title'),
        _seo: seoRelation,
      },
    } as EncodedContentType

    expect(
      getInitialSeoBindings({ contentType: seo, parentContentType: category }),
    ).toBeUndefined()
  })
})
