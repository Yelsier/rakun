import { describe, expect, it } from 'bun:test'

import {
  getCurrentPageInfo,
  getCurrentPageLiterals,
  runWithPageInfo,
} from './pageInfoStore'

describe('page runtime context', () => {
  it('keeps literals separate from page info', async () => {
    await runWithPageInfo(
      { title: 'Project', locale: 'en' },
      async () => {
        await Promise.resolve()

        expect(getCurrentPageInfo()).toEqual({
          title: 'Project',
          locale: 'en',
        })
        expect(getCurrentPageLiterals()).toEqual({
          'navigation.home': 'Home',
        })
      },
      { 'navigation.home': 'Home' },
    )
  })
})
