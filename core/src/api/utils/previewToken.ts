import { getPlatform } from '../../platform'

export const hashPreviewToken = (token: string) =>
  getPlatform().crypto.hash('sha256', token, 'hex')
