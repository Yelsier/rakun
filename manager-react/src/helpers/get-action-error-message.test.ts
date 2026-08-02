import { describe, expect, test } from 'bun:test'

import { getActionErrorMessage } from './get-action-error-message'

const templateValidationMessage =
  'The template for "UseCase" must contain exactly one Content slot.'

const validationError = {
  key: 'VALIDATION',
  cause: {
    errors: [
      {
        path: ['modules'],
        message: templateValidationMessage,
      },
    ],
  },
}

describe('getActionErrorMessage', () => {
  test('returns the first structured validation message', () => {
    expect(getActionErrorMessage(validationError, 'Could not save')).toBe(
      templateValidationMessage,
    )
  })

  test('returns a structured validation message from an HTTP error body', () => {
    expect(
      getActionErrorMessage(
        {
          message: 'Manager request failed',
          body: { appError: validationError },
        },
        'Could not save',
      ),
    ).toBe(templateValidationMessage)
  })

  test('does not expose structured errors for non-validation app errors', () => {
    expect(
      getActionErrorMessage(
        {
          key: 'INTERNAL',
          cause: {
            errors: [{ message: 'Internal implementation detail' }],
          },
        },
        'Could not save',
      ),
    ).toBe('Could not save')
  })
})
