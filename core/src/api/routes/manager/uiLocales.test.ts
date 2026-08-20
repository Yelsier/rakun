import { describe, expect, test } from 'bun:test'

import {
  resolveManagerHomePageGroupId,
  resolveManagerSiteUrl,
  resolveManagerUiFeatures,
  resolveManagerRealtimeMetadata,
} from './uiLocales'

describe('resolveManagerHomePageGroupId', () => {
  test('uses the variant group and falls back to the configured document id', () => {
    const homePage = { _id: 'home-variant' }

    expect(
      resolveManagerHomePageGroupId(homePage, {
        _localeVariantGroupId: 'home-group',
      }),
    ).toBe('home-group')
    expect(resolveManagerHomePageGroupId(homePage)).toBe('home-variant')
    expect(resolveManagerHomePageGroupId(null)).toBeUndefined()
  })
})

describe('resolveManagerSiteUrl', () => {
  test('accepts public HTTP URLs and normalizes them', () => {
    expect(resolveManagerSiteUrl(' https://example.com/site ')).toBe(
      'https://example.com/site',
    )
    expect(resolveManagerSiteUrl('http://localhost:3000')).toBe(
      'http://localhost:3000/',
    )
  })

  test('rejects empty, relative, and unsafe URLs', () => {
    expect(resolveManagerSiteUrl('')).toBeUndefined()
    expect(resolveManagerSiteUrl('/site')).toBeUndefined()
    expect(resolveManagerSiteUrl('javascript:alert(1)')).toBeUndefined()
  })
})

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

describe('resolveManagerRealtimeMetadata', () => {
  test('uses polling when no platform is configured', () => {
    expect(resolveManagerRealtimeMetadata()).toEqual({
      transport: 'polling',
      intervalMs: 3000,
    })
  })

  test('exposes only transport configuration', () => {
    expect(
      resolveManagerRealtimeMetadata({
        platform: {
          realtime: {
            metadata: {
              transport: 'websocket',
              endpoint: '/api/realtime',
            },
          },
        },
      } as never),
    ).toEqual({
      transport: 'websocket',
      endpoint: '/api/realtime',
    })
  })
})
