import { createHash, randomBytes, timingSafeEqual } from 'crypto'

export const MFA_RECOVERY_CODE_COUNT = 10

export const normalizeRecoveryCode = (value: string) =>
  value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

export const hashRecoveryCode = (value: string) =>
  createHash('sha256').update(normalizeRecoveryCode(value)).digest('hex')

export const generateRecoveryCodes = () => {
  const codes = Array.from({ length: MFA_RECOVERY_CODE_COUNT }, () => {
    const value = randomBytes(8).toString('hex').toUpperCase()
    return value.match(/.{1,4}/g)?.join('-') ?? value
  })

  return {
    codes,
    hashes: codes.map(hashRecoveryCode),
  }
}

export const findRecoveryCodeHash = (
  code: string,
  hashes: readonly string[],
) => {
  const candidate = Buffer.from(hashRecoveryCode(code), 'hex')

  return hashes.find((hash) => {
    const stored = Buffer.from(hash, 'hex')
    return stored.length === candidate.length && timingSafeEqual(stored, candidate)
  })
}
