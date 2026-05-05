'use client'

import z from 'zod'

import type { ManagerOperationName } from '@/client/operations'

export const operationNameToTitle = (name: string) => {
  const parts = name.split('.')
  const last = parts[parts.length - 1] ?? name
  return last
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[.-]/g, ' ')
    .replace(/\b\w/g, (match: string) => match.toUpperCase())
}

const manualExamples: Partial<Record<ManagerOperationName, unknown>> = {
  'manager.get': {
    contentType: 'Post',
    id: 'replace-with-id',
  },
  'manager.list': {
    contentType: 'Post',
    query: {
      options: {
        limit: 10,
        page: 1,
      },
    },
  },
  'manager.create': {
    contentType: 'Post',
    data: {
      _type: 'Post',
    },
  },
  'manager.update': {
    contentType: 'Post',
    id: 'replace-with-id',
    data: {},
  },
  'manager.delete': {
    contentType: 'Post',
    id: 'replace-with-id',
  },
  'manager.auth.deleteSession': {
    token: 'replace-with-session-token',
  },
  'manager.auth.webauthn.register.options': {
    deviceName: 'My Laptop',
  },
  'manager.auth.webauthn.auth.options': {
    challengeToken: 'replace-with-challenge-token',
  },
}

export const createDefaultInput = (
  name: ManagerOperationName,
  _schema?: z.ZodTypeAny,
) => {
  const manual = manualExamples[name]
  if (manual !== undefined) {
    return JSON.stringify(manual, null, 2)
  }

  return '{}'
}

export const stringifySchema = (schema?: z.ZodTypeAny) => {
  if (!schema) return '{}'
  return JSON.stringify(z.toJSONSchema(schema), null, 2)
}
