import z from 'zod'

export const literalVariableOutput = z.object({
  name: z.string(),
  kind: z.enum(['argument', 'plural', 'select', 'selectordinal']),
})

export const literalValidationOutput = z.object({
  isValid: z.boolean(),
  missing: z.array(z.string()),
  kindMismatch: z.array(z.string()),
  extra: z.array(z.string()),
})

export const listLiteralsInput = z.object({
  locale: z.string().min(2).optional(),
})

export const listLiteralsOutput = z.object({
  defaultLocale: z.string(),
  selectedLocale: z.string(),
  locales: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      default: z.boolean(),
    }),
  ),
  items: z.array(
    z.object({
      key: z.string(),
      defaultMessage: z.string(),
      description: z.string(),
      usedBy: z.array(z.string()),
      variables: z.array(literalVariableOutput),
      translation: z.string().optional(),
      hasTranslation: z.boolean(),
      validation: literalValidationOutput,
    }),
  ),
})

export type ListLiteralsInput = z.infer<typeof listLiteralsInput>
export type ListLiteralsOutput = z.infer<typeof listLiteralsOutput>
