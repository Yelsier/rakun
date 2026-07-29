import { getMailService } from './index'
import { MailErrorInvalidData, type SendMailInput, type MailService } from './mailService'

type MaybePromise<T> = T | Promise<T>

export type RenderedMailContent = {
  html?: string
  text?: string
}

export type MailTemplate<Props> = {
  subject: string | ((props: Props) => MaybePromise<string>)
  render: (props: Props) => MaybePromise<RenderedMailContent>
}

export type MailTemplateRegistry = Record<string, MailTemplate<never>>

export type MailTemplateProps<TTemplate> =
  TTemplate extends MailTemplate<infer Props> ? Props : never

export type SendTemplateMailInput<
  TTemplates extends MailTemplateRegistry,
  TName extends Extract<keyof TTemplates, string>,
> = Omit<SendMailInput, 'subject' | 'html' | 'text'> & {
  template: TName
  props: MailTemplateProps<TTemplates[TName]>
}

export type MailSender<TTemplates extends MailTemplateRegistry> = {
  send<TName extends Extract<keyof TTemplates, string>>(
    input: SendTemplateMailInput<TTemplates, TName>
  ): ReturnType<MailService['send']>
}

export const defineMailTemplate = <Props>(template: MailTemplate<Props>): MailTemplate<Props> =>
  template

export const createMailSender = <const TTemplates extends MailTemplateRegistry>({
  templates,
  service,
}: {
  templates: TTemplates
  service?: MailService | (() => MailService)
}): MailSender<TTemplates> => ({
  async send(input) {
    const template = templates[input.template]

    if (!template) {
      throw new MailErrorInvalidData(`Unknown mail template "${input.template}"`)
    }

    const { template: templateName, props, ...envelope } = input
    const subject =
      typeof template.subject === 'function'
        ? await (template.subject as unknown as (value: unknown) => MaybePromise<string>)(props)
        : template.subject
    const content = await (
      template.render as unknown as (value: unknown) => MaybePromise<RenderedMailContent>
    )(props)
    const mailService = typeof service === 'function' ? service() : (service ?? getMailService())

    return mailService.send({
      ...envelope,
      ...content,
      subject,
      event: {
        ...envelope.event,
        template: templateName,
      },
    })
  },
})
