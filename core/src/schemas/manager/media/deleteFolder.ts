import z from 'zod'

export const deleteFolderInput = z.object({
  id: z.string().min(1),
  recursive: z.literal(true),
})

export const deleteFolderOutput = z.object({
  ok: z.boolean(),
  deletedFolders: z.number().min(0),
  deletedMedia: z.number().min(0),
})

export type DeleteFolderInput = z.infer<typeof deleteFolderInput>
export type DeleteFolderOutput = z.infer<typeof deleteFolderOutput>
