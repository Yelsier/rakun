import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { ManagerMessageKey } from './catalog'
import { formatIcuLike } from './format'
import {
  createManagerLocaleMap,
  ENGLISH_LOCALE_CODE,
  resolveManagerMessage,
} from './resolve'
import type {
  ManagerLocaleInputPack,
  ManagerLocaleOption,
  ManagerMessageValuesByKey,
  TranslationValues,
} from './types'

const MANAGER_LOCALE_STORAGE_KEY = 'cms-selected-manager-language'

type TranslateFn = {
  <K extends ManagerMessageKey>(
    key: K,
    ...args: undefined extends ManagerMessageValuesByKey[K]
      ? [values?: Exclude<ManagerMessageValuesByKey[K], undefined>]
      : [values: ManagerMessageValuesByKey[K]]
  ): string
  (key: string, values?: TranslationValues): string
}

type ManagerI18nContextValue = {
  t: TranslateFn
  locale: string
  locales: ManagerLocaleOption[]
  setLocale: (code: string) => void
  ready: boolean
}

const ManagerI18nContext = createContext<ManagerI18nContextValue | null>(null)

export type ManagerI18nProviderProps = {
  localePacks?: readonly ManagerLocaleInputPack[]
  children: ReactNode
}

const readStoredLocaleCode = (): string | null => {
  try {
    const raw = localStorage.getItem(MANAGER_LOCALE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return typeof parsed === 'string' ? parsed : null
  } catch {
    return null
  }
}

export const ManagerI18nProvider = ({
  localePacks = [],
  children,
}: ManagerI18nProviderProps) => {
  const packsByCode = useMemo(() => {
    return createManagerLocaleMap(localePacks)
  }, [localePacks])

  const locales = useMemo<ManagerLocaleOption[]>(
    () =>
      Array.from(packsByCode.values()).map((pack) => ({
        code: pack.code,
        name: pack.name,
      })),
    [packsByCode],
  )

  const [locale, setLocaleState] = useState(ENGLISH_LOCALE_CODE)

  useEffect(() => {
    const stored = readStoredLocaleCode()
    if (stored && packsByCode.has(stored)) {
      setLocaleState(stored)
      return
    }

    setLocaleState(ENGLISH_LOCALE_CODE)
  }, [packsByCode])

  const setLocale = useCallback(
    (code: string) => {
      if (!packsByCode.has(code)) return

      try {
        localStorage.setItem(MANAGER_LOCALE_STORAGE_KEY, JSON.stringify(code))
      } catch {
        // Ignore storage failures (private mode, SSR, etc).
      }

      setLocaleState(code)
    },
    [packsByCode],
  )

  const t = useCallback<TranslateFn>(
    (key: string, ...args: unknown[]) => {
      const values = args[0] as TranslationValues | undefined
      const message = resolveManagerMessage({
        packsByCode,
        locale,
        key,
      })

      return formatIcuLike({
        message,
        locale,
        values,
      })
    },
    [locale, packsByCode],
  )

  const value = useMemo<ManagerI18nContextValue>(
    () => ({
      t,
      locale,
      locales,
      setLocale,
      ready: true,
    }),
    [t, locale, locales, setLocale],
  )

  return (
    <ManagerI18nContext.Provider value={value}>
      {children}
    </ManagerI18nContext.Provider>
  )
}

export const useManagerI18n = () => {
  const ctx = useContext(ManagerI18nContext)

  if (!ctx) {
    throw new Error('useManagerI18n must be used within <ManagerI18nProvider>.')
  }

  return ctx
}
