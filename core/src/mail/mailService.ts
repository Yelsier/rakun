import type {
  MailAdapter,
  MailAddress,
  MailAddressInput,
  MailAddressListInput,
  MailAttachment,
  MailMessage,
  MailSendResult,
} from './adapters'
import type { EventLogService } from '../eventLog'
import { Logger } from '../lib/Logger'
import { getPlatform } from '../platform'

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
  /**
   * Non-sensitive context added to the persistent mail events.
   * Template senders populate `template` automatically.
   */
  event?: {
    template?: string
    source?: string
    correlationId?: string
    tags?: readonly string[]
  }
}

export type MailServiceConfig = {
  adapter: MailAdapter
  defaultFrom?: MailAddressInput
  defaultReplyTo?: MailAddressListInput
  /**
   * Injected by Rakun bootstrap. Standalone services can provide their own
   * event log or omit it when persistence is managed externally.
   */
  eventLog?: EventLogService
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

const countAddresses = (...groups: Array<MailAddress[] | undefined>) =>
  groups.reduce((total, group) => total + (group?.length ?? 0), 0)

const createSafeEventData = (
  message: MailMessage,
  config: MailServiceConfig,
  template: string | undefined
) => ({
  provider: config.adapter.provider ?? 'custom',
  recipientCount: countAddresses(message.to, message.cc, message.bcc),
  toCount: message.to.length,
  ccCount: message.cc?.length ?? 0,
  bccCount: message.bcc?.length ?? 0,
  attachmentCount: message.attachments?.length ?? 0,
  hasHtml: Boolean(message.html),
  hasText: Boolean(message.text),
  ...(template ? { template } : {}),
})

const recordMailEvent = async (
  eventLog: EventLogService,
  input: SendMailInput,
  event: {
    type: 'mail.send.attempted' | 'mail.send.succeeded' | 'mail.send.failed'
    severity?: 'info' | 'error'
    outcome: 'pending' | 'success' | 'failure'
    correlationId: string
    resourceId?: string
    data: Record<string, string | number | boolean>
  }
) =>
  eventLog.record({
    type: event.type,
    category: 'mail',
    severity: event.severity,
    outcome: event.outcome,
    source: input.event?.source ?? '@rakun-kit/core/mail',
    correlationId: event.correlationId,
    actor: { type: 'system' },
    resource: {
      type: 'mail',
      ...(event.resourceId ? { id: event.resourceId } : {}),
    },
    tags: ['mail', ...(input.event?.tags ?? [])],
    data: event.data,
  })

export const createMailServiceFromAdapter = (config: MailServiceConfig): MailService => ({
  rawAdapter: config.adapter,

  async send(input) {
    const message = normalizeMessage(input, config)
    const correlationId =
      input.event?.correlationId ?? getPlatform().crypto.randomUUID()
    const safeData = createSafeEventData(message, config, input.event?.template)
    const startedAt = Date.now()

    if (config.eventLog) {
      try {
        await recordMailEvent(config.eventLog, input, {
          type: 'mail.send.attempted',
          outcome: 'pending',
          correlationId,
          data: safeData,
        })
      } catch (error) {
        throw new MailErrorSendFailed(
          'Mail was not sent because its event log could not be persisted',
          error
        )
      }
    }

    try {
      const result = await config.adapter.send(message)

      if (!result.id?.trim()) {
        throw new MailErrorSendFailed('Mail adapter returned an empty message id')
      }

      if (config.eventLog) {
        try {
          await recordMailEvent(config.eventLog, input, {
            type: 'mail.send.succeeded',
            outcome: 'success',
            correlationId,
            resourceId: result.id,
            data: {
              ...safeData,
              durationMs: Date.now() - startedAt,
              acceptedCount: result.accepted?.length ?? 0,
              rejectedCount: result.rejected?.length ?? 0,
            },
          })
        } catch (error) {
          Logger?.error?.('mail.send.succeeded event could not be persisted', {
            correlationId,
            errorName: error instanceof Error ? error.name : 'UnknownError',
          })
        }
      }

      return result
    } catch (error) {
      const mailError =
        error instanceof MailError ? error : new MailErrorSendFailed('Failed to send mail', error)

      if (config.eventLog) {
        try {
          await recordMailEvent(config.eventLog, input, {
            type: 'mail.send.failed',
            severity: 'error',
            outcome: 'failure',
            correlationId,
            data: {
              ...safeData,
              durationMs: Date.now() - startedAt,
              errorName: error instanceof Error ? error.name : 'UnknownError',
            },
          })
        } catch (logError) {
          Logger?.error?.('mail.send.failed event could not be persisted', {
            correlationId,
            errorName: logError instanceof Error ? logError.name : 'UnknownError',
          })
        }
      }

      throw mailError
    }
  },
})
