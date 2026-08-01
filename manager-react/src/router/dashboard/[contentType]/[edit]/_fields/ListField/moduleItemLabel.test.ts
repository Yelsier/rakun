import { describe, expect, test } from 'bun:test'
import type { EncodedRelationField } from '@rakun-kit/core/client'

import {
  getFirstRequiredFieldName,
  getModuleDistinguishingLabel,
  resolveModuleItemTitle,
} from './moduleItemLabel'

describe('moduleItemLabel', () => {
  test('picks the first required non-api field', () => {
    const contentType = {
      name: 'FeatureCarouselItem',
      fields: {
        eyebrow: { isRequired: false, visibility: 'manager' },
        title: { isRequired: true, visibility: 'manager' },
        summary: { isRequired: false, visibility: 'manager' },
        _internal: { isRequired: true, visibility: 'api' },
      },
      uniques: [],
    } as unknown as EncodedRelationField['contentType']

    expect(getFirstRequiredFieldName(contentType)).toBe('title')
  })

  test('reads distinguishing label from new relation data', () => {
    const field = {
      config: { type: 'Relation', ui: 'ContentType' },
      contentType: {
        name: 'FeatureCarouselItem',
        fields: {
          title: { isRequired: true, visibility: 'manager' },
          summary: { isRequired: false, visibility: 'manager' },
        },
        uniques: [],
      },
    } as unknown as EncodedRelationField

    expect(
      getModuleDistinguishingLabel(
        field,
        {
          type: 'new',
          data: {
            _type: 'FeatureCarouselItem',
            title: 'Aurora feature',
          },
        },
        (value) => value as never,
      ),
    ).toBe('Aurora feature')
  })

  test('prefers distinguishing label over type title', () => {
    expect(
      resolveModuleItemTitle({
        typeTitle: 'Feature Carousel Item',
        distinguishingLabel: 'Aurora feature',
      }),
    ).toBe('Aurora feature')

    expect(
      resolveModuleItemTitle({
        typeTitle: 'Feature Carousel Item',
      }),
    ).toBe('Feature Carousel Item')
  })
})
