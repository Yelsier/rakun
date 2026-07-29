import { decodeCamelCase } from '@/helpers/decode-camel-case'

export const translateFieldLabel = (
  t: (key: string) => string,
  fieldKey: string,
): string => {
  const baseKey = fieldKey.split('.')[0] || fieldKey
  const projectMessageKey = `field.${baseKey}`
  const projectTranslation = t(projectMessageKey)
  if (projectTranslation !== projectMessageKey) {
    return projectTranslation
  }

  const legacyMessageKey = `fields.${baseKey}`
  const legacyTranslation = t(legacyMessageKey)
  return legacyTranslation === legacyMessageKey
    ? decodeCamelCase(baseKey)
    : legacyTranslation
}
