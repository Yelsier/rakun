import { managerMessages, type ManagerMessageKey } from './catalog'
import type { ManagerLocaleInputPack, ManagerLocalePack } from './types'

export const ENGLISH_LOCALE_CODE = 'en'

export const createEnglishLocalePack = (): ManagerLocalePack => ({
  code: ENGLISH_LOCALE_CODE,
  name: 'English',
  messages: Object.fromEntries(
    Object.entries(managerMessages).map(([key, definition]) => [
      key,
      definition.defaultMessage,
    ]),
  ) as Record<ManagerMessageKey, string>,
})

export const createManagerLocaleMap = (
  localePacks: readonly ManagerLocaleInputPack[],
): Map<string, ManagerLocalePack> => {
  const english = createEnglishLocalePack()
  const map = new Map<string, ManagerLocalePack>([
    [ENGLISH_LOCALE_CODE, english],
  ])

  for (const pack of localePacks) {
    const current = map.get(pack.code)
    map.set(pack.code, {
      code: pack.code,
      name: pack.name,
      messages: {
        ...english.messages,
        ...current?.messages,
        ...pack.messages,
      } as ManagerLocalePack['messages'],
    })
  }

  return map
}

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
