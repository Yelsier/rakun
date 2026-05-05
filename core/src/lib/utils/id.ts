import z from 'zod'

export const Id = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId')

export type Id = z.infer<typeof Id>

export const isId = Id.safeParse.bind(Id)
