import { describe, expect, test } from 'bun:test'

import { resolveManagerUiFeatures } from './uiLocales'

describe('resolveManagerUiFeatures', () => {
  test('disables password recovery without a mail service', () => {
    expect(
      resolveManagerUiFeatures({
        accountRecovery: {
          passwordReset: {},
        },
      })
    ).toEqual({
      passwordRecovery: false,
      login: { password: true, adapters: [] },
    })
  })

  test('disables password recovery without password reset configuration', () => {
    expect(
      resolveManagerUiFeatures({
        mail: {},
      })
    ).toEqual({
      passwordRecovery: false,
      login: { password: true, adapters: [] },
    })
  })

  test('enables password recovery when mail and password reset are configured', () => {
    expect(
      resolveManagerUiFeatures({
        mail: {},
        accountRecovery: {
          passwordReset: {},
        },
      })
    ).toEqual({
      passwordRecovery: true,
      login: { password: true, adapters: [] },
    })
  })

  test('exposes only safe login adapter metadata', () => {
    expect(
      resolveManagerUiFeatures({
        login: {
          password: false,
          adapters: [
            {
              id: 'github',
              label: 'GitHub Enterprise',
              icon: 'github',
            },
          ],
        },
      })
    ).toEqual({
      passwordRecovery: false,
      login: {
        password: false,
        adapters: [{ id: 'github', label: 'GitHub Enterprise', icon: 'github' }],
      },
    })
  })
})
