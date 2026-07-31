import { describe, expect, test } from 'bun:test'

import { getRequestRateLimitIdentifier } from '../api/utils/authRateLimit'
import { normalizePasswordLoginIp } from './passwordFail2ban'

describe('password fail2ban IP resolution', () => {
  test('accepts IP addresses and normalizes IPv4-mapped IPv6 values', () => {
    expect(normalizePasswordLoginIp('203.0.113.8')).toBe('203.0.113.8')
    expect(normalizePasswordLoginIp('2001:db8::1')).toBe('2001:db8::1')
    expect(normalizePasswordLoginIp('::ffff:203.0.113.8')).toBe('203.0.113.8')
  })

  test('does not persist unknown or malformed identifiers', () => {
    expect(normalizePasswordLoginIp(undefined)).toBeUndefined()
    expect(normalizePasswordLoginIp('unknown')).toBeUndefined()
    expect(normalizePasswordLoginIp('not-an-ip')).toBeUndefined()
  })

  test('prefers the adapter-resolved IP over spoofable forwarding headers', () => {
    expect(
      getRequestRateLimitIdentifier({
        req: {
          ip: '203.0.113.10',
          headers: { 'x-forwarded-for': '198.51.100.20' },
        },
      } as never),
    ).toBe('203.0.113.10')
  })
})
