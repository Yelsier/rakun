import { describe, expect, it } from 'bun:test'

import { registerInternalContentType } from '../../lib/Registry'
import { PasswordResetToken, UserMfa } from '../../internal-content-types'
import { requireContentType } from './requireContentType'

describe('manager authentication content type access', () => {
  registerInternalContentType(UserMfa, { override: true })
  registerInternalContentType(PasswordResetToken, { override: true })

  it('does not expose authentication secrets through generic manager operations', () => {
    expect(() => requireContentType('UserMfa')).toThrow('FORBIDDEN')
    expect(() => requireContentType('PasswordResetToken')).toThrow('FORBIDDEN')
  })
})
