import z from 'zod'

export const isNeverOptional = (
  schema: z.ZodTypeAny,
): schema is z.ZodOptional<z.ZodNever> => {
  // unwrap efectos / defaults / etc si te interesa (opcional)
  let s: z.ZodTypeAny = schema

  // Si tienes wrappers tipo ZodEffects, ZodDefault, etc, desenvuélvelos
  // (puedes quitar esto si no lo necesitas)
  while (
    s instanceof z.ZodDefault ||
    s instanceof z.ZodCatch ||
    s instanceof z.ZodReadonly
  ) {
    // @ts-expect-error - acceso interno de Zod
    s = s._def.schema ?? s._def.innerType ?? s._def.type
  }

  if (!(s instanceof z.ZodOptional)) return false

  const inner = s.unwrap()
  return inner instanceof z.ZodNever
}
