type ListFormatOptions = Intl.ListFormatOptions

const formatterCache = new Map<string, Intl.ListFormat>()

const getFormatter = (locale: string, options?: ListFormatOptions) => {
  const type = options?.type ?? 'conjunction'
  const style = options?.style ?? 'long'
  const key = `${locale}|${type}|${style}`

  const cached = formatterCache.get(key)
  if (cached) return cached

  const formatter = new Intl.ListFormat(locale, { type, style })
  formatterCache.set(key, formatter)
  return formatter
}

export const formatList = (
  items: string[],
  locale: string,
  options?: ListFormatOptions,
) => {
  if (typeof Intl === 'undefined' || typeof Intl.ListFormat === 'undefined') {
    return items.join(', ')
  }

  return getFormatter(locale, options).format(items)
}

