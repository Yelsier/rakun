import { Resend } from 'resend'

import type {
  MailAdapter,
  MailAddress,
  MailAddressInput,
  MailAddressListInput,
  MailMessage,
  MailSendResult,
  MailServiceConfig,
} from '@rakun-kit/core'

export type ResendMailServiceConfig = {
  apiKey: string
  defaultFrom?: MailAddressInput
  defaultReplyTo?: MailAddressListInput
}

const formatAddress = ({ address, name }: MailAddress): string =>
  name ? `${name} <${address}>` : address

const formatAddresses = (addresses: MailAddress[] | undefined): string[] | undefined =>
  addresses?.map(formatAddress)

export class ResendMailAdapter implements MailAdapter {
  private readonly client: Resend

  constructor(apiKey: string, client?: Resend) {
    if (!apiKey.trim()) {
      throw new Error('Resend apiKey must not be empty')
    }

    this.client = client ?? new Resend(apiKey)
  }

  async send(message: MailMessage): Promise<MailSendResult> {
    const content = message.html
      ? {
          html: message.html,
          ...(message.text !== undefined ? { text: message.text } : {}),
        }
      : { text: message.text! }
    const { data, error } = await this.client.emails.send({
      from: formatAddress(message.from),
      to: formatAddresses(message.to)!,
      cc: formatAddresses(message.cc),
      bcc: formatAddresses(message.bcc),
      replyTo: formatAddresses(message.replyTo),
      subject: message.subject,
      ...content,
      headers: message.headers,
      attachments: message.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: Buffer.from(attachment.content),
        contentType: attachment.contentType,
        contentId: attachment.contentId,
      })),
    })

    if (error) {
      throw new Error(`Resend failed to send mail: ${error.message}`)
    }

    if (!data?.id) {
      throw new Error('Resend returned an empty message id')
    }

    return { id: data.id }
  }
}

export const createResendMailServiceConfig = (
  config: ResendMailServiceConfig
): MailServiceConfig => ({
  adapter: new ResendMailAdapter(config.apiKey),
  defaultFrom: config.defaultFrom,
  defaultReplyTo: config.defaultReplyTo,
})
