import z from 'zod'

export const mediaFolderOutput = z.object({
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
  path: z.string(),
  parentId: z.string().optional(),
  description: z.string().optional(),
})

export const createFolderInput = z.object({
  name: z.string().min(1),
  parentId: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
})

export const createFolderOutput = mediaFolderOutput

export type CreateFolderInput = z.infer<typeof createFolderInput>
export type CreateFolderOutput = z.infer<typeof createFolderOutput>
