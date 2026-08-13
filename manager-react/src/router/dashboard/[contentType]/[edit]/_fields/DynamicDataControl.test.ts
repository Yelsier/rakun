import { describe, expect, test } from 'bun:test'
import type {
  EncodedContentType,
  EncodedFieldUnknown,
  EncodedFileField,
  EncodedListField,
  EncodedRelationField,
  EncodedSimpleListField,
} from '@rakun-kit/core/client'

import {
  buildFilter,
  currentDocumentListSourceOptions,
  isDynamicFallbackRequired,
  isMappableDynamicListField,
  listItemTargetFields,
  readFilterState,
  sourceFieldOptions,
  targetMappingFields,
} from './DynamicDataControl'

const fieldState = {
  isRequired: false,
  isTranslatable: false,
  visibility: 'all',
  isDynamic: true,
} as const

const fileProperties = {
  url: 'string',
  previewUrl: 'string',
  name: 'string',
  title: 'string',
  alt: 'string',
  mime: 'string',
  srcSet: 'string',
  width: 'number',
  height: 'number',
  size: 'number',
} as const

const fileField = (mediaType: EncodedFileField['mediaType'], isMultiple = false) =>
  ({
    ...fieldState,
    config: {
      type: 'File',
      ui: 'File',
      capabilities: {
        valueKind: isMultiple ? 'array' : 'object',
        dynamic: { properties: fileProperties },
      },
    },
    mediaType,
    isMultiple,
  }) as EncodedFileField

const stringField = {
  ...fieldState,
  config: { type: 'String', ui: 'Text', capabilities: { valueKind: 'string' } },
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
    _iterator: stringField,
    featuredImage: fileField('Image'),
    document: fileField('Document'),
    featuredImages: fileField('Image', true),
    website: {
      ...fieldState,
      config: {
        type: 'Link',
        ui: 'Link',
        capabilities: {
          valueKind: 'object',
          dynamic: {
            properties: { title: 'string', href: 'string' },
            mapProperties: true,
          },
        },
      },
    } as EncodedFieldUnknown,
    category: {
      ...fieldState,
      config: {
        type: 'Relation',
        ui: 'ContentType',
        capabilities: { valueKind: 'object', dynamic: { relation: true } },
      },
      contentType: category,
    } as EncodedRelationField,
  },
} as EncodedContentType

describe('dynamic data fallback validation', () => {
  test('makes the fallback optional when a required field is bound', () => {
    const requiredField = { ...stringField, isRequired: true }

    expect(isDynamicFallbackRequired(requiredField, undefined)).toBe(true)
    expect(
      isDynamicFallbackRequired(requiredField, {
        contentType: 'Article',
        path: 'title',
      })
    ).toBe(false)
  })

  test('keeps optional fields optional without a binding', () => {
    expect(isDynamicFallbackRequired(stringField, undefined)).toBe(false)
  })
})

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
    const values = sourceFieldOptions(project, stringField).map((option) => option.value)

    expect(values).toContain('title')
    expect(values).not.toContain('_iterator')
    expect(values).toContain('featuredImage.url')
    expect(values).toContain('document.alt')
    expect(values).toContain('website.href')
    expect(values).toContain('website.title')
    expect(values).not.toContain('website')
    expect(values).not.toContain('featuredImage')
    expect(values).not.toContain('featuredImages')
  })

  test('includes ids for nested relation fields', () => {
    const values = sourceFieldOptions(project).map((option) => option.value)

    expect(values).toContain('category._id')
    expect(values).toContain('category.slug')
  })

  test('offers complete links only to link targets', () => {
    const linkField = project.fields.website
    const values = sourceFieldOptions(project, linkField).map((option) => option.value)

    expect(values).toContain('website')
    expect(values).not.toContain('website.href')
    expect(values).not.toContain('website.title')
  })

  test('offers the current document info fields to SEO string targets', () => {
    const routeableProject = {
      ...project,
      routes: [{ key: 'project', hasPage: true }],
      fields: {
        ...project.fields,
        _seo: {
          ...fieldState,
          config: {
            type: 'Relation',
            ui: 'ContentType',
            capabilities: { valueKind: 'object', dynamic: { relation: true } },
          },
          contentType: {
            name: 'Seo',
            uniques: [],
            fields: { title: stringField },
          },
        } as EncodedRelationField,
      },
    } as EncodedContentType

    expect(sourceFieldOptions(routeableProject, stringField).map(({ value }) => value)).toEqual(
      expect.arrayContaining(['$href', 'title', 'category.slug'])
    )
  })
})

describe('dynamic data target mapping fields', () => {
  test('expands link targets into independently mapped properties', () => {
    expect(targetMappingFields(project).map(([path]) => path)).toEqual([
      'title',
      'featuredImage',
      'document',
      'featuredImages',
      'website.title',
      'website.href',
      'category',
    ])
  })

  test('maps structured homogeneous arrays but keeps primitive arrays direct', () => {
    const linkArray = {
      ...fieldState,
      config: {
        type: 'List',
        ui: 'SimpleList',
        capabilities: {
          valueKind: 'array',
          dynamic: { collection: 'homogeneous' },
        },
      },
      field: project.fields.website,
    } as EncodedSimpleListField
    const relationArray = {
      ...fieldState,
      config: {
        type: 'List',
        ui: 'SimpleList',
        capabilities: {
          valueKind: 'array',
          dynamic: { collection: 'homogeneous' },
        },
      },
      field: project.fields.category,
    } as EncodedSimpleListField
    const stringArray = {
      ...fieldState,
      config: {
        type: 'List',
        ui: 'SimpleList',
        capabilities: {
          valueKind: 'array',
          dynamic: { collection: 'homogeneous' },
        },
      },
      field: stringField,
    } as EncodedSimpleListField

    expect(isMappableDynamicListField(linkArray)).toBe(true)
    expect(isMappableDynamicListField(relationArray)).toBe(true)
    expect(isMappableDynamicListField(stringArray)).toBe(false)
    expect(listItemTargetFields(linkArray, 'Link').map(([path]) => path)).toEqual(['title', 'href'])
    expect(listItemTargetFields(relationArray, 'Category').map(([path]) => path)).toEqual(['slug'])
  })

  test('uses plugin capabilities without knowing the custom editor id', () => {
    const pluginObject = {
      ...fieldState,
      config: {
        type: 'String',
        ui: 'Text',
        editor: 'test.plugin-object',
        capabilities: {
          valueKind: 'object',
          dynamic: {
            properties: { label: 'string', url: 'string' },
            mapProperties: true,
          },
        },
      },
    } as EncodedFieldUnknown
    const pluginArray = {
      ...fieldState,
      config: {
        type: 'List',
        ui: 'SimpleList',
        capabilities: {
          valueKind: 'array',
          dynamic: { collection: 'homogeneous' },
        },
      },
      field: pluginObject,
    } as EncodedSimpleListField
    const pluginContentType = {
      name: 'PluginContent',
      uniques: [],
      fields: { action: pluginObject },
    } as EncodedContentType

    expect(targetMappingFields(pluginContentType).map(([path]) => path)).toEqual([
      'action.label',
      'action.url',
    ])
    expect(isMappableDynamicListField(pluginArray)).toBe(true)
    expect(listItemTargetFields(pluginArray, 'test.plugin-object').map(([path]) => path)).toEqual([
      'label',
      'url',
    ])
  })
})

describe('current document list source options', () => {
  test('offers block arrays with their related item content type', () => {
    const linkItem = {
      name: 'LinkItem',
      uniques: [],
      fields: {
        title: stringField,
      },
    } as EncodedContentType
    const categoryRelation = {
      ...fieldState,
      config: {
        type: 'Relation',
        ui: 'ContentType',
        capabilities: { valueKind: 'object', dynamic: { relation: true } },
      },
      contentType: linkItem,
      only: 'new',
    } as EncodedRelationField
    const categories = {
      ...fieldState,
      config: {
        type: 'List',
        ui: 'List',
        capabilities: {
          valueKind: 'array',
          dynamic: { collection: 'heterogeneous' },
        },
      },
      fields: [{ name: 'Category', field: categoryRelation }],
    } as EncodedListField
    const document = {
      name: 'Project',
      uniques: [],
      fields: {
        title: stringField,
        categories,
        _iterator: categories,
      },
    } as EncodedContentType

    expect(currentDocumentListSourceOptions(document)).toEqual([
      {
        label: 'Current document · categories',
        value: 'current-document:categories:Category',
        contentType: linkItem,
        path: 'categories',
        itemName: 'Category',
      },
    ])
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
      })
    ).toEqual({
      $and: [{ title: { $contains: 'launch' } }, { published: true }],
    })

    expect(
      buildFilter({
        combinator: 'or',
        conditions: [
          { field: 'status', operator: 'equals', value: 'draft' },
          { field: 'status', operator: 'equals', value: 'review' },
        ],
      })
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
        ]
      )
    ).toEqual({
      $and: [
        { views: { $gte: 10 } },
        { score: { $in: [1, 2, 3] } },
        { subtitle: { $exists: false } },
      ],
    })
  })

  test('builds and reads values from the current context and root document', () => {
    const state = {
      combinator: 'and' as const,
      conditions: [
        {
          field: 'category.slug',
          operator: 'equals' as const,
          value: 'slug',
          valueSource: 'current' as const,
        },
        {
          field: 'site',
          operator: 'equals' as const,
          value: 'site',
          valueSource: 'document' as const,
        },
      ],
    }

    expect(buildFilter(state)).toEqual({
      $and: [{ 'category.slug': { $current: 'slug' } }, { site: { $document: 'site' } }],
    })
    expect(
      readFilterState({
        $and: [{ 'category.slug': { $current: 'slug' } }, { site: { $document: 'site' } }],
      })
    ).toEqual(state)
  })

  test('reads existing simple and logical filters', () => {
    expect(
      readFilterState({
        $or: [{ title: { $contains: 'news' } }, { featured: true }],
      })
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
