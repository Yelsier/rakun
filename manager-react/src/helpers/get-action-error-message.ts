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

const getAppErrorMessage = (error: unknown) => {
  if (instanceofAppErrorShape(error)) {
    return getCauseMessage(error.cause)
  }

  if (!isRecord(error)) return null

  if ('appError' in error && instanceofAppErrorShape(error.appError)) {
    return getCauseMessage(error.appError.cause)
  }

  return null
}

export const getActionErrorMessage = (
  error: unknown,
  fallback = 'Action failed',
) => {
  if (error instanceof Error) {
    return cleanMessage(error.message) ?? fallback
  }

  const appErrorMessage = getAppErrorMessage(error)

  if (appErrorMessage) return appErrorMessage

  if (!isRecord(error)) return fallback

  return (
    cleanMessage(error.message) ??
    getCauseMessage(error.cause) ??
    getAppErrorMessage(error.body) ??
    fallback
  )
}
