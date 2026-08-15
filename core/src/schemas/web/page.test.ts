import { describe, expect, it } from 'bun:test'

import { pageOutput } from './page'

describe('page output schema', () => {
  it('keeps page modules only in layout', () => {
    const parsed = pageOutput.parse({
      renderMode: 'static',
      modules: [{ _id: 'duplicate', _type: 'Hero' }],
      layout: [
        {
          type: 'content',
          modules: [{ _id: 'hero', _type: 'Hero' }],
        },
      ],
      literals: { 'navigation.home': 'Home' },
      info: { title: 'Landing page' },
    })

    expect('modules' in parsed).toBe(false)
    expect(parsed.layout[0]).toEqual({
      type: 'content',
      modules: [{ _id: 'hero', _type: 'Hero' }],
    })
    expect(parsed.literals).toEqual({ 'navigation.home': 'Home' })
    expect(parsed.info).toEqual({ title: 'Landing page' })
  })

  it('requires layout', () => {
    expect(() =>
      pageOutput.parse({
        renderMode: 'static',
        modules: [],
      })
    ).toThrow()
  })
})
