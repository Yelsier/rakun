import z from 'zod'

import { mediaFolderOutput } from './createFolder'

export const listFoldersInput = z.object({
  parentId: z.string().min(1).optional(),
})

export const listFoldersOutput = z.object({
  items: z.array(mediaFolderOutput),
})

export type ListFoldersInput = z.infer<typeof listFoldersInput>
export type ListFoldersOutput = z.infer<typeof listFoldersOutput>
