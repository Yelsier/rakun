import type { MailServiceConfig } from './mailService'
import { createMailServiceFromAdapter, type MailService, type SendMailInput } from './mailService'

let _mailService: MailService | null = null
let _config: MailServiceConfig | null = null

export const createMailConnection = (config: MailServiceConfig): void => {
  _config = config
}

export const createMailService = (config: MailServiceConfig): MailService => {
  _config = config
  _mailService = createMailServiceFromAdapter(config)
  return _mailService
}

export const getMailService = (): MailService => {
  if (!_mailService) {
    if (!_config) {
      throw new Error('Mail service not initialized. Call createMailConnection first.')
    }

    return createMailService(_config)
  }

  return _mailService
}

export const hasMailService = (): boolean => Boolean(_mailService || _config)

export const sendMail = (input: SendMailInput) => getMailService().send(input)

export * from './adapters'
export * from './mailService'
export * from './templates'
