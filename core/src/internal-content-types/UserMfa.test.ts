import { describe, expect, it } from 'bun:test'

import { UserMfa } from './UserMfa'

describe('UserMfa mutation protection', () => {
  it('rejects generic CMS mutations', () => {
    expect(() =>
      UserMfa.hooks?.beforeUpdate?.({
        id: 'mfa-id',
        data: { enabled: false },
        context: {
          requestContext: {},
        } as never,
      }),
    ).toThrow('FORBIDDEN')
  })

  it('allows the explicit MFA workflow', () => {
    expect(() =>
      UserMfa.hooks?.beforeUpdate?.({
        id: 'mfa-id',
        data: { enabled: true },
        context: {
          requestContext: {},
          reason: 'mfa totp enabled',
        } as never,
      }),
    ).not.toThrow()
  })
})
