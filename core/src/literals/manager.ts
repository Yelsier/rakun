import { managerLiteralCatalogInput } from './managerLiterals'

type ManagerLiteralParamSpecValue =
  | 'string'
  | 'number'
  | 'boolean'
  | readonly string[]

type ManagerLiteralInput = {
  defaultMessage: string
  translations?: Record<string, string>
  params?: Record<string, ManagerLiteralParamSpecValue>
}

export type ManagerLiteralCatalogInput = Record<string, ManagerLiteralInput>

export type ManagerLiteralKey = keyof typeof managerLiteralCatalogInput

type ParamSpecToType<T extends ManagerLiteralParamSpecValue> =
  T extends 'number'
    ? number
    : T extends 'boolean'
      ? boolean
      : T extends readonly (infer U)[]
        ? U
        : string

type ParamsFromSpec<
  T extends Record<string, ManagerLiteralParamSpecValue> | undefined,
> =
  T extends Record<string, ManagerLiteralParamSpecValue>
    ? { [P in keyof T]: ParamSpecToType<T[P]> }
    : undefined

export type ManagerLiteralValuesByKey = {
  [K in ManagerLiteralKey]: (typeof managerLiteralCatalogInput)[K] extends {
    params: infer P extends Record<string, ManagerLiteralParamSpecValue>
  }
    ? ParamsFromSpec<P>
    : undefined
}

const managerLiteralDefinitionsByKey = new Map<
  string,
  (typeof managerLiteralCatalogInput)[ManagerLiteralKey]
>(
  Object.entries(managerLiteralCatalogInput).map(([key, definition]) => [
    key,
    definition,
  ]),
)

const localeCandidates = (locale: string): string[] => {
  const normalized = locale.toLowerCase()
  const base = normalized.split('-')[0] || ''
  return Array.from(new Set([normalized, base, 'en']))
}

const resolveManagerLiteralMessage = ({
  definition,
  locale,
}: {
  definition: ManagerLiteralInput
  locale: string
}): string => {
  const translations = definition.translations || {}
  const candidates = localeCandidates(locale)

  for (const candidate of candidates) {
    const translated = translations[candidate]
    if (typeof translated === 'string' && translated.length > 0) {
      return translated
    }
  }

  return definition.defaultMessage
}

export const getManagerLiterals = (
  locale: string,
): Record<ManagerLiteralKey, string> =>
  Object.fromEntries(
    Object.entries(managerLiteralCatalogInput).map(([key, definition]) => [
      key,
      resolveManagerLiteralMessage({
        definition,
        locale,
      }),
    ]),
  ) as Record<ManagerLiteralKey, string>

export const getManagerLiteralMessage = (
  key: string,
  locale: string,
): string | undefined => {
  const definition = managerLiteralDefinitionsByKey.get(key)
  if (!definition) return undefined
  return resolveManagerLiteralMessage({
    definition,
    locale,
  })
}
