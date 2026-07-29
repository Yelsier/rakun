import type {
  MailAdapter,
  MailAddress,
  MailAddressInput,
  MailAddressListInput,
  MailAttachment,
  MailMessage,
  MailSendResult,
} from './adapters'

type MailErrorTag = 'MailError' | 'MailErrorInvalidData' | 'MailErrorSendFailed'

export class MailError extends Error {
  _tag: MailErrorTag = 'MailError'

  constructor(
    public override readonly message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'MailError'
  }
}

export class MailErrorInvalidData extends MailError {
  constructor(
    public override readonly message: string,
    public readonly details?: unknown
  ) {
    super(message, details)
    this._tag = 'MailErrorInvalidData'
  }
}

export class MailErrorSendFailed extends MailError {
  constructor(
    public override readonly message: string,
    public readonly details?: unknown
  ) {
    super(message, details)
    this._tag = 'MailErrorSendFailed'
  }
}

export type SendMailInput = {
  from?: MailAddressInput
  to: MailAddressListInput
  cc?: MailAddressListInput
  bcc?: MailAddressListInput
  replyTo?: MailAddressListInput
  subject: string
  html?: string
  text?: string
  headers?: Record<string, string>
  attachments?: readonly MailAttachment[]
}

export type MailServiceConfig = {
  adapter: MailAdapter
  defaultFrom?: MailAddressInput
  defaultReplyTo?: MailAddressListInput
}

export interface MailService {
  rawAdapter: MailAdapter
  send(input: SendMailInput): Promise<MailSendResult>
}

const normalizeAddress = (input: MailAddressInput, field: string): MailAddress => {
  if (typeof input === 'string') {
    const address = input.trim()

    if (!address) {
      throw new MailErrorInvalidData(`${field} must not be empty`)
    }

    return { address }
  }

  const address = input.address?.trim()
  const name = input.name?.trim()

  if (!address) {
    throw new MailErrorInvalidData(`${field}.address must not be empty`)
  }

  return {
    address,
    ...(name ? { name } : {}),
  }
}

const normalizeAddressList = (
  input: MailAddressListInput | undefined,
  field: string,
  required = false
): MailAddress[] | undefined => {
  if (input === undefined) {
    if (required) {
      throw new MailErrorInvalidData(`${field} is required`)
    }

    return undefined
  }

  const values = Array.isArray(input) ? input : [input]

  if (required && values.length === 0) {
    throw new MailErrorInvalidData(`${field} must contain at least one address`)
  }

  const addresses = values.map((value, index) => normalizeAddress(value, `${field}[${index}]`))

  return addresses.length > 0 ? addresses : undefined
}

const normalizeAttachments = (
  attachments: readonly MailAttachment[] | undefined
): MailAttachment[] | undefined => {
  if (!attachments) return undefined

  return attachments.map((attachment, index) => {
    if (!attachment.filename?.trim()) {
      throw new MailErrorInvalidData(`attachments[${index}].filename must not be empty`)
    }

    if (!(attachment.content instanceof Uint8Array)) {
      throw new MailErrorInvalidData(`attachments[${index}].content must be a Uint8Array`)
    }

    return {
      ...attachment,
      filename: attachment.filename.trim(),
    }
  })
}

const normalizeMessage = (input: SendMailInput, config: MailServiceConfig): MailMessage => {
  const from = input.from ?? config.defaultFrom

  if (!from) {
    throw new MailErrorInvalidData('from is required when defaultFrom is not configured')
  }

  if (!input.subject?.trim()) {
    throw new MailErrorInvalidData('subject must not be empty')
  }

  if (!input.html?.trim() && !input.text?.trim()) {
    throw new MailErrorInvalidData('html or text is required')
  }

  return {
    from: normalizeAddress(from, 'from'),
    to: normalizeAddressList(input.to, 'to', true)!,
    cc: normalizeAddressList(input.cc, 'cc'),
    bcc: normalizeAddressList(input.bcc, 'bcc'),
    replyTo: normalizeAddressList(input.replyTo ?? config.defaultReplyTo, 'replyTo'),
    subject: input.subject,
    html: input.html,
    text: input.text,
    headers: input.headers ? { ...input.headers } : undefined,
    attachments: normalizeAttachments(input.attachments),
  }
}

export const createMailServiceFromAdapter = (config: MailServiceConfig): MailService => ({
  rawAdapter: config.adapter,

  async send(input) {
    const message = normalizeMessage(input, config)

    try {
      const result = await config.adapter.send(message)

      if (!result.id?.trim()) {
        throw new MailErrorSendFailed('Mail adapter returned an empty message id')
      }

      return result
    } catch (error) {
      if (error instanceof MailError) throw error

      throw new MailErrorSendFailed('Failed to send mail', error)
    }
  },
})
