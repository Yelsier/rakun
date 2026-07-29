'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import type { FileUploadProps } from '../../../ui/file-upload'
import { useTranslations } from '@/i18n'

type UseMediaUploadInput = {
  onUpload: NonNullable<FileUploadProps['onUpload']>
  refetchMedia: () => Promise<unknown>
}

export function useMediaUpload({ onUpload, refetchMedia }: UseMediaUploadInput) {
  const t = useTranslations()
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
      await refetchMedia().catch(() => undefined)
      toast.error(t('media.uploadFailed'), {
        description:
          error instanceof Error
            ? error.message
            : t('media.uploadUnexpectedError'),
        duration: 10000,
      })
      console.error('Unexpected error during upload:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const onFileReject = (file: File, message: string) => {
    const truncatedName =
      file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name
    toast(message, {
      description: t('media.fileRejected', { name: truncatedName }),
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
