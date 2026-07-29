export type MailAddress = {
  address: string
  name?: string
}

export type MailAddressInput = string | MailAddress

export type MailAddressListInput = MailAddressInput | readonly MailAddressInput[]

export type MailAttachment = {
  filename: string
  content: Uint8Array
  contentType?: string
  contentId?: string
}

export type MailMessage = {
  from: MailAddress
  to: MailAddress[]
  cc?: MailAddress[]
  bcc?: MailAddress[]
  replyTo?: MailAddress[]
  subject: string
  html?: string
  text?: string
  headers?: Record<string, string>
  attachments?: MailAttachment[]
}

export type MailSendResult = {
  id: string
  accepted?: MailAddress[]
  rejected?: MailAddress[]
}

export interface MailAdapter {
  readonly provider?: string
  send(message: MailMessage): Promise<MailSendResult>
}
