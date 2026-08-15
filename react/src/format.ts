import {
  getLiteralDefinition,
  type LiteralKey,
  type LiteralValuesByKey,
} from '@rakun-kit/core/literals'

export type TranslationValues = Record<
  string,
  string | number | boolean | null | undefined
>

type LiteralValuesForKey<K extends LiteralKey> =
  K extends keyof LiteralValuesByKey
    ? LiteralValuesByKey[K]
    : TranslationValues | undefined

export type TFromInfoArgs<K extends LiteralKey> = {
  info?: Record<string, unknown>
  literals?: Record<string, string>
  key: K
} & (undefined extends LiteralValuesForKey<K>
  ? { values?: Exclude<LiteralValuesForKey<K>, undefined> }
  : { values: LiteralValuesForKey<K> })

const getPluralCategory = (
  locale: string,
  value: number,
  type: Intl.PluralRuleType = 'cardinal',
) => new Intl.PluralRules(locale, { type }).select(value)

const formatIcuLike = ({
  message,
  locale,
  values,
}: {
  message: string
  locale: string
  values?: TranslationValues
}): string => {
  const safeValues = values || {}

  const complexResolved = message.replace(
    /\{(\w+),\s*(plural|select|selectordinal),\s*((?:[^{}]|\{[^{}]*\})*)\}/g,
    (_full, varName: string, kind: string, rawOptions: string) => {
      const options = new Map<string, string>()
      const optionRegex =
        /(=\d+|zero|one|two|few|many|other|\w+)\s*\{([^}]*)\}/g

      for (const match of rawOptions.matchAll(optionRegex)) {
        if (match[1] && match[2]) {
          options.set(match[1], match[2])
        }
      }

      const rawValue = safeValues[varName]

      if (kind === 'select') {
        const selectedKey =
          typeof rawValue === 'string' ? rawValue : String(rawValue ?? 'other')
        return options.get(selectedKey) ?? options.get('other') ?? ''
      }

      const numeric = Number(rawValue ?? 0)
      const exactKey = `=${numeric}`
      const category = getPluralCategory(
        locale,
        numeric,
        kind === 'selectordinal' ? 'ordinal' : 'cardinal',
      )
      const selected =
        options.get(exactKey) ??
        options.get(category) ??
        options.get('other') ??
        ''

      return selected.replace(/#/g, String(numeric))
    },
  )

  return complexResolved.replace(/\{(\w+)\}/g, (_full, varName: string) => {
    const value = safeValues[varName]
    if (value === null || value === undefined) return `{${varName}}`
    return String(value)
  })
}

export const getLiteralsFromInfo = (
  info?: Record<string, unknown>,
): Record<string, string> => {
  const maybeLiterals = info?.literals

  if (!maybeLiterals || typeof maybeLiterals !== 'object') return {}

  return Object.fromEntries(
    Object.entries(maybeLiterals as Record<string, unknown>).filter(
      ([, value]) => typeof value === 'string',
    ),
  ) as Record<string, string>
}

export const getLocaleFromInfo = (info?: Record<string, unknown>): string => {
  const locale = info?.locale
  return typeof locale === 'string' && locale ? locale : 'en'
}

export function tFromInfo<K extends LiteralKey>(args: TFromInfoArgs<K>): string
export function tFromInfo(args: {
  info?: Record<string, unknown>
  literals?: Record<string, string>
  key: string
  values?: TranslationValues
}): string
export function tFromInfo({
  info,
  literals,
  key,
  values,
}: {
  info?: Record<string, unknown>
  literals?: Record<string, string>
  key: string
  values?: TranslationValues
}): string {
  const resolvedLiterals = literals ?? getLiteralsFromInfo(info)
  const locale = getLocaleFromInfo(info)
  const message =
    resolvedLiterals[key] || getLiteralDefinition(key)?.defaultMessage || String(key)

  return formatIcuLike({
    message,
    locale,
    values,
  })
}
