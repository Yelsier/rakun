import { describe, expect, test } from 'bun:test'

import {
  createGitHubLoginAdapter,
  createGoogleLoginAdapter,
  createMicrosoftLoginAdapter,
} from './loginAdapters'

const config = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  redirectUri: 'https://cms.example.com/backend/login/callback',
}

describe('built-in login adapters', () => {
  test.each([
    ['github', createGitHubLoginAdapter(config)],
    ['google', createGoogleLoginAdapter(config)],
    ['microsoft', createMicrosoftLoginAdapter(config)],
  ] as const)('%s creates a stateful PKCE authorization URL', async (id, adapter) => {
    const url = new URL(
      await adapter.createAuthorizationUrl({
        state: 'login-state',
        codeChallenge: 'pkce-challenge',
      })
    )

    expect(adapter.id).toBe(id)
    expect(url.searchParams.get('state')).toBe('login-state')
    expect(url.searchParams.get('code_challenge')).toBe('pkce-challenge')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri)
  })
})
