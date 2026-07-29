import { managerMessages, type ManagerMessageKey } from './catalog'
import type { ManagerLocalePack } from './types'

export const ENGLISH_LOCALE_CODE = 'en'

export const createEnglishLocalePack = (): ManagerLocalePack => ({
  code: ENGLISH_LOCALE_CODE,
  name: 'English',
  messages: Object.fromEntries(
    Object.entries(managerMessages).map(([key, definition]) => [
      key,
      definition.defaultMessage,
    ]),
  ),
})

const localeCandidates = (locale: string): string[] => {
  const normalized = locale.toLowerCase()
  const base = normalized.split('-')[0] || ''
  return Array.from(new Set([normalized, base, ENGLISH_LOCALE_CODE]))
}

export const resolveManagerMessage = ({
  packsByCode,
  locale,
  key,
}: {
  packsByCode: Map<string, ManagerLocalePack>
  locale: string
  key: string
}): string => {
  for (const candidate of localeCandidates(locale)) {
    const pack = packsByCode.get(candidate)
    const message = pack?.messages[key]
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }

  const catalogEntry = managerMessages[key as ManagerMessageKey]
  if (catalogEntry) {
    return catalogEntry.defaultMessage
  }

  return key
}
