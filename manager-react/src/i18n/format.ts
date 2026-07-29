import type { TranslationValues } from './types'

const getPluralCategory = (
  locale: string,
  value: number,
  type: Intl.PluralRuleType = 'cardinal',
) => new Intl.PluralRules(locale, { type }).select(value)

export const formatIcuLike = ({
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
