import { describe, expect, mock, test } from 'bun:test'

import { resolveCollaborativeRootFieldState } from './collaborative-field-state'

describe('collaborative root field state', () => {
  test('uses the changed value for a top-level field', () => {
    const readRootFieldState = mock(() => undefined)

    expect(
      resolveCollaborativeRootFieldState({
        fieldId: 'Page.title',
        readRootFieldState,
        rootId: 'Page',
        state: 'Hello',
      })
    ).toEqual({ fieldName: 'title', nested: false, state: 'Hello' })
    expect(readRootFieldState).not.toHaveBeenCalled()
  })

  test('publishes the live root value for a nested module field', () => {
    const modules = [
      {
        name: 'hero',
        uid: 'module-1',
        value: { type: 'new', data: { title: 'Hello' } },
      },
    ]

    expect(
      resolveCollaborativeRootFieldState({
        fieldId: 'Page._template.module-1.hero.title',
        readRootFieldState: (fieldName) => (fieldName === '_template' ? modules : undefined),
        rootId: 'Page',
        state: 'Hello',
      })
    ).toEqual({ fieldName: '_template', nested: true, state: modules })
  })

  test('waits until the root field ref is available', () => {
    expect(
      resolveCollaborativeRootFieldState({
        fieldId: 'Page._template.module-1.hero.title',
        readRootFieldState: () => undefined,
        rootId: 'Page',
        state: 'Hello',
      })
    ).toBeNull()
  })
})
