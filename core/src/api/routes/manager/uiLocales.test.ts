import { describe, expect, test } from 'bun:test'

import { resolveManagerUiFeatures } from './uiLocales'

describe('resolveManagerUiFeatures', () => {
  test('disables password recovery without a mail service', () => {
    expect(
      resolveManagerUiFeatures({
        accountRecovery: {
          passwordReset: {},
        },
      }),
    ).toEqual({
      passwordRecovery: false,
    })
  })

  test('disables password recovery without password reset configuration', () => {
    expect(
      resolveManagerUiFeatures({
        mail: {},
      }),
    ).toEqual({
      passwordRecovery: false,
    })
  })

  test('enables password recovery when mail and password reset are configured', () => {
    expect(
      resolveManagerUiFeatures({
        mail: {},
        accountRecovery: {
          passwordReset: {},
        },
      }),
    ).toEqual({
      passwordRecovery: true,
    })
  })
})
