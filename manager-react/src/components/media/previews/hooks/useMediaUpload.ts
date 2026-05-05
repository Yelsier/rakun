'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import type { FileUploadProps } from '../../../ui/file-upload'

type UseMediaUploadInput = {
  onUpload: NonNullable<FileUploadProps['onUpload']>
  refetchMedia: () => Promise<unknown>
}

export function useMediaUpload({ onUpload, refetchMedia }: UseMediaUploadInput) {
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload: NonNullable<FileUploadProps['onUpload']> = async (
    selectedFiles,
    options,
  ) => {
    setIsUploading(true)
    try {
      await onUpload(selectedFiles, options)
      await refetchMedia()
      setFiles([])
    } catch (error) {
      toast.error('An unexpected error occurred during upload. Please try again.')
      console.error('Unexpected error during upload:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const onFileReject = (file: File, message: string) => {
    toast(message, {
      description: `"${file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}" has been rejected`,
    })
  }

  return {
    files,
    setFiles,
    isUploading,
    handleUpload,
    onFileReject,
  }
}
