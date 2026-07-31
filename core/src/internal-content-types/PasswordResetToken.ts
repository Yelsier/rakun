import ContentType from '../lib/ContentType'
import { Fields } from '../lib/fields'
import type { DBOutput } from '../lib/types'
import { ManagerUser } from './ManagerUser'
import { AppError } from '../lib/errors/AppError'

const allowedMutationReasons = new Set([
  'password reset requested',
  'password reset token superseded',
  'password reset token consumed',
  'password reset completed',
])

const assertInternalMutation = ({
  context,
}: {
  context: { requestContext?: unknown; reason?: string }
}) => {
  if (
    context.requestContext &&
    !allowedMutationReasons.has(context.reason ?? '')
  ) {
    throw new AppError('FORBIDDEN', {
      reason:
        'Password reset tokens cannot be changed through generic CMS operations',
    })
  }
}

export const PasswordResetToken = new ContentType({
  name: 'PasswordResetToken',
  fields: {
    tokenHash: Fields.string().required(),
    user: Fields.relation(ManagerUser).required(),
    expiresAt: Fields.date().required(),
    consumedAt: Fields.date(),
  },
  uniques: [['tokenHash']],
})
  .withHooks({
    beforeInsert: ({ context }) => {
      assertInternalMutation({ context })
    },
    beforeUpdate: ({ context }) => {
      assertInternalMutation({ context })
    },
    beforeUpdateMany: ({ context }) => {
      assertInternalMutation({ context })
    },
    beforeDelete: ({ context }) => {
      assertInternalMutation({ context })
    },
  })
  .hideFromManager()

export type PasswordResetToken = typeof PasswordResetToken
export type PasswordResetTokenManager = DBOutput<PasswordResetToken>
