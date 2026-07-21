import { describe, expect, test } from 'bun:test'
import type {
  EncodedContentType,
  EncodedFieldUnknown,
  EncodedFileField,
} from '@rakun-kit/core/client'

import { sourceFieldOptions } from './DynamicDataControl'

const fieldState = {
  isRequired: false,
  isTranslatable: false,
  visibility: 'all',
  isDynamic: true,
} as const

const fileField = (
  mediaType: EncodedFileField['mediaType'],
  isMultiple = false,
) =>
  ({
    ...fieldState,
    config: { type: 'File', ui: 'File' },
    mediaType,
    isMultiple,
  }) as EncodedFileField

const stringField = {
  ...fieldState,
  config: { type: 'String', ui: 'Text' },
} as EncodedFieldUnknown

const project = {
  name: 'Project',
  uniques: [],
  fields: {
    title: stringField,
    featuredImage: fileField('Image'),
    document: fileField('Document'),
    featuredImages: fileField('Image', true),
  },
} as EncodedContentType

describe('dynamic data source field options', () => {
  test('offers a complete single file to a compatible file target', () => {
    expect(sourceFieldOptions(project, fileField('Image'))).toEqual([
      {
        label: 'featuredImage',
        value: 'featuredImage',
        kind: 'object',
      },
    ])
  })

  test('respects file media type and cardinality', () => {
    expect(sourceFieldOptions(project, fileField('Any'))).toEqual([
      {
        label: 'featuredImage',
        value: 'featuredImage',
        kind: 'object',
      },
      {
        label: 'document',
        value: 'document',
        kind: 'object',
      },
    ])

    expect(sourceFieldOptions(project, fileField('Image', true))).toEqual([
      {
        label: 'featuredImages',
        value: 'featuredImages',
        kind: 'array',
      },
    ])
  })

  test('keeps file properties available to scalar targets', () => {
    const values = sourceFieldOptions(project, stringField).map(
      (option) => option.value,
    )

    expect(values).toContain('title')
    expect(values).toContain('featuredImage.url')
    expect(values).toContain('document.alt')
    expect(values).not.toContain('featuredImage')
    expect(values).not.toContain('featuredImages')
  })
})
