import { defineOperation } from '@rakun-kit/next'
import { z } from 'zod'

import { testMailSender } from './mail'

export const apiOperations = {
  'demo.helloWorld': defineOperation({
    access: 'public',
    kind: 'query',
    method: 'get',
    description: 'Return a hello world message with the provided text',
    input: z.object({
      text: z.string().default('world'),
    }),
    output: z.object({
      message: z.string(),
    }),
    resolve: ({ input }) => ({
      message: `Hello ${input.text}`,
    }),
  }),
  'demo.sendTestMail': defineOperation({
    access: 'public',
    kind: 'mutation',
    method: 'post',
    description: 'Render and send the preview Next test email through Resend',
    input: z.object({
      to: z.email(),
      name: z.string().trim().min(1).default('Ada'),
      activationUrl: z.url().default('https://example.com/activate'),
    }),
    output: z.object({
      id: z.string(),
    }),
    resolve: async ({ input }) => {
      if (!process.env.RESEND_API_KEY?.trim() || !process.env.RAKUN_MAIL_FROM?.trim()) {
        throw new Error('RESEND_API_KEY and RAKUN_MAIL_FROM are required to send test mail')
      }

      const result = await testMailSender.send({
        template: 'test',
        props: {
          name: input.name,
          activationUrl: input.activationUrl,
        },
        to: input.to,
      })

      return { id: result.id }
    },
  }),
}

export type ApiOperations = typeof apiOperations
