import { describe, expect, it } from 'bun:test'

import {
  findRecoveryCodeHash,
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
} from './recoveryCodes'

describe('MFA recovery codes', () => {
  it('generates unique display codes and stores only their hashes', () => {
    const recovery = generateRecoveryCodes()

    expect(recovery.codes).toHaveLength(10)
    expect(new Set(recovery.codes).size).toBe(10)
    expect(recovery.hashes).toHaveLength(10)

    for (const [index, code] of recovery.codes.entries()) {
      expect(code).toMatch(/^[A-F0-9]{4}(?:-[A-F0-9]{4}){3}$/)
      expect(recovery.hashes[index]).toBe(hashRecoveryCode(code))
      expect(recovery.hashes[index]).not.toContain(
        normalizeRecoveryCode(code),
      )
    }
  })

  it('matches codes regardless of separators and case', () => {
    const code = 'ABCD-EF12-3456-7890'
    const hash = hashRecoveryCode(code)

    expect(findRecoveryCodeHash('abcd ef12 3456 7890', [hash])).toBe(hash)
    expect(findRecoveryCodeHash('FFFF-FFFF-FFFF-FFFF', [hash])).toBeUndefined()
  })
})
