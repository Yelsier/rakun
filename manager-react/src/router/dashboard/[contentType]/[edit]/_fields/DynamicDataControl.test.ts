import { describe, expect, test } from 'bun:test'
import type {
  EncodedContentType,
  EncodedFieldUnknown,
  EncodedFileField,
  EncodedRelationField,
} from '@rakun-kit/core/client'

import {
  buildFilter,
  readFilterState,
  sourceFieldOptions,
} from './DynamicDataControl'

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

const category = {
  name: 'Category',
  uniques: [],
  fields: {
    slug: stringField,
  },
} as EncodedContentType

const project = {
  name: 'Project',
  uniques: [],
  fields: {
    title: stringField,
    featuredImage: fileField('Image'),
    document: fileField('Document'),
    featuredImages: fileField('Image', true),
    category: {
      ...fieldState,
      config: { type: 'Relation', ui: 'ContentType' },
      contentType: category,
    } as EncodedRelationField,
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

  test('includes ids for nested relation fields', () => {
    const values = sourceFieldOptions(project).map((option) => option.value)

    expect(values).toContain('category._id')
    expect(values).toContain('category.slug')
  })
})

describe('dynamic data query filters', () => {
  test('builds multiple conditions with AND or OR', () => {
    expect(
      buildFilter({
        combinator: 'and',
        conditions: [
          { field: 'title', operator: 'contains', value: 'launch' },
          { field: 'published', operator: 'true', value: '' },
        ],
      }),
    ).toEqual({
      $and: [
        { title: { $contains: 'launch' } },
        { published: true },
      ],
    })

    expect(
      buildFilter({
        combinator: 'or',
        conditions: [
          { field: 'status', operator: 'equals', value: 'draft' },
          { field: 'status', operator: 'equals', value: 'review' },
        ],
      }),
    ).toEqual({
      $or: [{ status: 'draft' }, { status: 'review' }],
    })
  })

  test('uses typed values and the extended comparison operators', () => {
    expect(
      buildFilter(
        {
          combinator: 'and',
          conditions: [
            { field: 'views', operator: 'greaterThanOrEqual', value: '10' },
            { field: 'score', operator: 'in', value: '1, 2, 3' },
            { field: 'subtitle', operator: 'notExists', value: '' },
          ],
        },
        [
          { label: 'views', value: 'views', kind: 'number' },
          { label: 'score', value: 'score', kind: 'number' },
        ],
      ),
    ).toEqual({
      $and: [
        { views: { $gte: 10 } },
        { score: { $in: [1, 2, 3] } },
        { subtitle: { $exists: false } },
      ],
    })
  })

  test('builds and reads values from the current document', () => {
    const state = {
      combinator: 'and' as const,
      conditions: [
        {
          field: 'category.slug',
          operator: 'equals' as const,
          value: 'slug',
          valueSource: 'current' as const,
        },
      ],
    }

    expect(buildFilter(state)).toEqual({
      'category.slug': { $current: 'slug' },
    })
    expect(
      readFilterState({ 'category.slug': { $current: 'slug' } }),
    ).toEqual(state)
  })

  test('reads existing simple and logical filters', () => {
    expect(
      readFilterState({
        $or: [
          { title: { $contains: 'news' } },
          { featured: true },
        ],
      }),
    ).toEqual({
      combinator: 'or',
      conditions: [
        { field: 'title', operator: 'contains', value: 'news' },
        { field: 'featured', operator: 'true', value: '' },
      ],
    })

    expect(readFilterState({ title: 'Home', featured: false })).toEqual({
      combinator: 'and',
      conditions: [
        { field: 'title', operator: 'equals', value: 'Home' },
        { field: 'featured', operator: 'false', value: '' },
      ],
    })
  })
})
