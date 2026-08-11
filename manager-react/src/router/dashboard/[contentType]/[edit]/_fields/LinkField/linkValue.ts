import type { LinkfieldValue } from '@rakun-kit/core/client'

import {
  isTranslatableData,
  type DefaultDataTypes,
  type FieldValue,
} from '../shared'

const normalizeLegacyLink = (value: unknown): LinkfieldValue | undefined => {
  if (typeof value === 'string') return { href: value, title: '' }
  if (typeof value === 'object' && value !== null) {
    return value as LinkfieldValue
  }

  return undefined
}

export const transformLinkDefaultData = (
  value: DefaultDataTypes<FieldValue>,
): DefaultDataTypes<LinkfieldValue> => {
  if (isTranslatableData(value)) {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) => {
        if (key === '_tag') return [[key, entry]]

        const normalized = normalizeLegacyLink(entry)
        return normalized ? [[key, normalized]] : []
      }),
    ) as DefaultDataTypes<LinkfieldValue>
  }

  return normalizeLegacyLink(value)
}
