'use client'

import { File, FileAudio2, FileImage, FileText, Film } from 'lucide-react'

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

export const formatPercent = (value: number): string => `${value.toFixed(1)}%`

export const isImage = (mime: string) => mime.startsWith('image/')
export const isVideo = (mime: string) => mime.startsWith('video/')
export const isAudio = (mime: string) => mime.startsWith('audio/')
export const isPdf = (mime: string) => mime === 'application/pdf'

export function FileTypeIcon({ mime }: { mime: string }) {
  if (isImage(mime)) return <FileImage className='size-5' />
  if (isVideo(mime)) return <Film className='size-5' />
  if (isAudio(mime)) return <FileAudio2 className='size-5' />
  if (isPdf(mime)) return <FileText className='size-5' />
  return <File className='size-5' />
}
