import { getPlatform } from '../../platform'

export const MFA_RECOVERY_CODE_COUNT = 10

export const normalizeRecoveryCode = (value: string) =>
  value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

export const hashRecoveryCode = (value: string) =>
  getPlatform().crypto.hash('sha256', normalizeRecoveryCode(value), 'hex')

export const generateRecoveryCodes = () => {
  const codes = Array.from({ length: MFA_RECOVERY_CODE_COUNT }, () => {
    const value = Buffer.from(getPlatform().crypto.randomBytes(8))
      .toString('hex')
      .toUpperCase()
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
    return (
      stored.length === candidate.length &&
      getPlatform().crypto.timingSafeEqual(stored, candidate)
    )
  })
}
