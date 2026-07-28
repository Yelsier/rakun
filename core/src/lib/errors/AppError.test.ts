import { describe, expect, it } from 'bun:test'

import {
  getAppErrorShape,
  getAppErrorStatusCode,
  isAppError,
} from './AppError'

describe('AppError', () => {
  it('recognizes app errors created by another module instance', () => {
    const foreignError = Object.assign(new Error('FORBIDDEN'), {
      appError: {
        key: 'FORBIDDEN' as const,
        cause: { reason: 'Missing permission' },
      },
    })

    expect(isAppError(foreignError)).toBe(true)
    expect(getAppErrorShape(foreignError)).toEqual(foreignError.appError)
    expect(getAppErrorStatusCode(foreignError)).toBe(403)
  })
})
