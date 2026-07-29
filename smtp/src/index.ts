import nodemailer, { type Transporter } from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'

import type {
  MailAdapter,
  MailAddress,
  MailAddressInput,
  MailAddressListInput,
  MailMessage,
  MailSendResult,
  MailServiceConfig,
} from '@rakun-kit/core'

type SmtpSendResult = {
  messageId?: string
  accepted?: unknown[]
  rejected?: unknown[]
}

type SmtpTransporter = Pick<Transporter, 'sendMail'>

export type SmtpMailServiceConfig = {
  transport: string | SMTPTransport.Options
  defaultFrom?: MailAddressInput
  defaultReplyTo?: MailAddressListInput
}

const formatAddress = ({ address, name }: MailAddress): string =>
  name ? `${name} <${address}>` : address

const formatAddresses = (addresses: MailAddress[] | undefined): string[] | undefined =>
  addresses?.map(formatAddress)

const normalizeProviderAddresses = (
  addresses: unknown[] | undefined
): MailAddress[] | undefined => {
  if (!addresses?.length) return undefined

  return addresses.map((address) => ({ address: String(address) }))
}

export class SmtpMailAdapter implements MailAdapter {
  private readonly transporter: SmtpTransporter

  constructor(transport: string | SMTPTransport.Options, transporter?: SmtpTransporter) {
    this.transporter =
      transporter ?? (nodemailer.createTransport(transport) as unknown as SmtpTransporter)
  }

  async send(message: MailMessage): Promise<MailSendResult> {
    const result = (await this.transporter.sendMail({
      from: formatAddress(message.from),
      to: formatAddresses(message.to),
      cc: formatAddresses(message.cc),
      bcc: formatAddresses(message.bcc),
      replyTo: formatAddresses(message.replyTo),
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: message.headers,
      attachments: message.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: Buffer.from(attachment.content),
        contentType: attachment.contentType,
        cid: attachment.contentId,
      })),
    })) as SmtpSendResult

    return {
      id: result.messageId ?? '',
      accepted: normalizeProviderAddresses(result.accepted),
      rejected: normalizeProviderAddresses(result.rejected),
    }
  }
}

export const createSmtpMailServiceConfig = (config: SmtpMailServiceConfig): MailServiceConfig => ({
  adapter: new SmtpMailAdapter(config.transport),
  defaultFrom: config.defaultFrom,
  defaultReplyTo: config.defaultReplyTo,
})
