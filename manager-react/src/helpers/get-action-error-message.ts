import { instanceofAppErrorShape } from '@rakun-kit/core/client'

const cleanMessage = (value: unknown) => {
  if (typeof value !== 'string') return null

  const message = value.trim()

  if (!message || message === 'undefined') return null

  return message
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const getCauseMessage = (cause: unknown) => {
  if (!isRecord(cause)) return null

  return cleanMessage(cause.message) ?? cleanMessage(cause.reason)
}

const getValidationMessage = (cause: unknown) => {
  if (!isRecord(cause) || !Array.isArray(cause.errors)) return null

  for (const issue of cause.errors) {
    if (!isRecord(issue)) continue

    const message = cleanMessage(issue.message)
    if (message) return message
  }

  return null
}

const getAppErrorMessage = (error: unknown) => {
  if (instanceofAppErrorShape(error)) {
    return (
      getCauseMessage(error.cause) ??
      (error.key === 'VALIDATION' ? getValidationMessage(error.cause) : null)
    )
  }

  if (!isRecord(error)) return null

  if ('appError' in error && instanceofAppErrorShape(error.appError)) {
    return (
      getCauseMessage(error.appError.cause) ??
      (error.appError.key === 'VALIDATION'
        ? getValidationMessage(error.appError.cause)
        : null)
    )
  }

  return null
}

export const getActionErrorMessage = (
  error: unknown,
  fallback = 'Action failed',
) => {
  const appErrorMessage = getAppErrorMessage(error)

  if (appErrorMessage) return appErrorMessage

  if (isRecord(error)) {
    const bodyAppErrorMessage = getAppErrorMessage(error.body)
    if (bodyAppErrorMessage) return bodyAppErrorMessage

    const causeAppErrorMessage = getAppErrorMessage(error.cause)
    if (causeAppErrorMessage) return causeAppErrorMessage
  }

  if (error instanceof Error) {
    return cleanMessage(error.message) ?? fallback
  }

  if (!isRecord(error)) return fallback

  return (
    cleanMessage(error.message) ??
    getCauseMessage(error.cause) ??
    fallback
  )
}
