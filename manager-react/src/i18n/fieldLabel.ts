import { decodeCamelCase } from '@/helpers/decode-camel-case'

export const translateFieldLabel = (
  t: (key: string) => string,
  fieldKey: string,
): string => {
  const baseKey = fieldKey.split('.')[0] || fieldKey
  const messageKey = `fields.${baseKey}`
  const translated = t(messageKey)
  return translated === messageKey ? decodeCamelCase(baseKey) : translated
}
