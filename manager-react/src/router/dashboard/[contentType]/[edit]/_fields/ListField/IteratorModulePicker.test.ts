import { describe, expect, test } from 'bun:test'
import type {
  EncodedContentType,
  EncodedListFieldItem,
  EncodedRelationField,
} from '@rakun-kit/core/client'

import { getIteratorModuleDisplay } from './IteratorModulePicker'

describe('iterator module picker display', () => {
  test('includes a trimmed module preview URL', () => {
    const contentType = {
      name: 'Hero',
      fields: {},
      uniques: [],
      modulePicker: {
        title: 'Hero section',
        preview: ' /images/modules/hero.webp ',
      },
    } as EncodedContentType
    const entry = {
      name: 'Hero',
      field: {
        config: { type: 'Relation', ui: 'ContentType' },
        contentType,
      } as EncodedRelationField,
    } satisfies EncodedListFieldItem

    expect(getIteratorModuleDisplay(entry)).toMatchObject({
      fieldName: 'Hero',
      preview: '/images/modules/hero.webp',
      queryExisting: true,
      title: 'Hero section',
    })
  })

  test('does not query saved modules for API-only inline markers', () => {
    const contentType = {
      name: 'TemplateContent',
      fields: {},
      uniques: [],
      modulePicker: {
        title: 'Content',
      },
    } as EncodedContentType
    const entry = {
      name: 'TemplateContent',
      field: {
        config: { type: 'Relation', ui: 'ContentType' },
        contentType,
        only: 'new',
      } as EncodedRelationField,
    } satisfies EncodedListFieldItem

    expect(getIteratorModuleDisplay(entry).queryExisting).toBe(false)
  })
})
