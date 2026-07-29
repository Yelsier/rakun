import { createElement, type ComponentType } from 'react'
import { render, type RenderOptions as JsxEmailRenderOptions } from 'jsx-email'

import { defineMailTemplate, type MailTemplate } from '@rakun-kit/core'

type MaybePromise<T> = T | Promise<T>

export type CreateJsxEmailTemplateInput<Props> = {
  component: ComponentType<Props>
  subject: string | ((props: Props) => MaybePromise<string>)
  renderOptions?: Omit<JsxEmailRenderOptions, 'plainText'>
  text?: false | ((props: Props) => MaybePromise<string>)
}

export const createJsxEmailTemplate = <Props extends object>({
  component,
  subject,
  renderOptions,
  text,
}: CreateJsxEmailTemplateInput<Props>): MailTemplate<Props> =>
  defineMailTemplate({
    subject,
    async render(props) {
      const html = await render(createElement(component, props), renderOptions)
      const plainText =
        text === false
          ? undefined
          : typeof text === 'function'
            ? await text(props)
            : await render(createElement(component, props), {
                ...renderOptions,
                plainText: true,
              })

      return {
        html,
        text: plainText,
      }
    },
  })

export type { JsxEmailRenderOptions }
