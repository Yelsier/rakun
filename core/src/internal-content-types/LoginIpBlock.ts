import ContentType from '../lib/ContentType'
import { Fields } from '../lib/fields'
import type { DBOutput } from '../lib/types'

export const LoginIpBlock = new ContentType({
  name: 'LoginIpBlock',
  permissions: false,
  fields: {
    ip: Fields.string().required(),
    failedAttempts: Fields.number().required(),
    lastFailedAt: Fields.date().required(),
    blockedAt: Fields.date(),
  },
  uniques: [['ip']],
}).hideFromManager()

export type LoginIpBlock = typeof LoginIpBlock
export type LoginIpBlockManager = DBOutput<LoginIpBlock>
