const environment = process.env.ENVIRONMENT || 'local'
const managerPrefix = process.env.MANAGER_PREFIX || 'manager'
const baseDomain = process.env.BASE_DOMAIN || 'localhost'

export const RP_ID =
  environment === 'local' ? 'localhost' : `${managerPrefix}.${baseDomain}`
export const ORIGIN = environment === 'local' ? `http://${RP_ID}:3000` : `https://${RP_ID}`

export const toBase64URL = (credentialId: string) => {
  if (!credentialId) return credentialId

  if (
    !credentialId.includes('+') &&
    !credentialId.includes('/') &&
    !credentialId.includes('=')
  ) {
    return credentialId
  }

  const decoded = Buffer.from(credentialId, 'base64')
  const asUtf8 = decoded.toString('utf8')
  // Legacy bug: id was stored as base64(utf8(base64urlId))
  if (/^[A-Za-z0-9_-]+$/.test(asUtf8)) {
    return asUtf8
  }

  return decoded.toString('base64url')
}

export const toB64 = (buf: Buffer) => buf.toString('base64')
