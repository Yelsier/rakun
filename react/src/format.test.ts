import { describe, expect, it } from 'bun:test'

import { tFromInfo } from './format'

describe('page translations', () => {
  it('reads literals supplied separately from page info', () => {
    expect(
      tFromInfo({
        info: { locale: 'en' },
        literals: { greeting: 'Hello {name}' },
        key: 'greeting',
        values: { name: 'Rakun' },
      }),
    ).toBe('Hello Rakun')
  })

  it('continues to accept legacy literals inside info', () => {
    expect(
      tFromInfo({
        info: {
          locale: 'en',
          literals: { greeting: 'Hello' },
        },
        key: 'greeting',
      }),
    ).toBe('Hello')
  })
})
