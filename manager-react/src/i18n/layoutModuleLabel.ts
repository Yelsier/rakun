import { decodeCamelCase } from '@/helpers/decode-camel-case'

export const translateLayoutModuleLabel = (
  t: (key: string) => string,
  layoutKey: string,
  contentTypeName: string,
): string => {
  const messageKey = `layoutModule.${layoutKey}`
  const translated = t(messageKey)
  return translated === messageKey
    ? decodeCamelCase(contentTypeName)
    : translated
}
