'use client'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $insertNodes, COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical'
import type { LexicalCommand } from 'lexical'
import { ImageIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import {
  $createImageNode,
  type ImagePayload,
} from '@/components/editor/nodes/ImageNode'
import { useToolbarContext } from '@/components/editor/context/toolbar-context'
import { Button } from '@/components/ui/button'
import { useManagerClient } from '@/client/react'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { useTranslations } from '@/i18n'
import { resolveMediaUrl, useMedia, type MediaRecord } from '@/media'

export type InsertImagePayload = ImagePayload

export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> =
  createCommand('INSERT_IMAGE_COMMAND')

const resolveImageSrc = async (
  media: MediaRecord,
  request: ReturnType<typeof useManagerClient>['request'],
) => {
  if (media.previewUrl) return media.previewUrl
  if (media.url) return media.url

  const key = media.previewKey || media.key
  if (!key || !media.access) return null

  const result = await resolveMediaUrl({ key, access: media.access }, { request })
  return result.url || null
}

export function ImagesPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        const imageNode = $createImageNode(payload)
        $insertNodes([imageNode])
        return true
      },
      COMMAND_PRIORITY_EDITOR,
    )
  }, [editor])

  return null
}

export function ImageToolbarPlugin() {
  const t = useTranslations()
  const { activeEditor } = useToolbarContext()
  const { openMediaLibrary } = useMedia()
  const managerClient = useManagerClient()
  const [loading, setLoading] = useState(false)

  const insertImageFromLibrary = useCallback(async () => {
    if (loading) return

    setLoading(true)
    try {
      const mediaOrList = await openMediaLibrary({ mediaType: 'Image' })
      if (!mediaOrList) return

      const media = (
        Array.isArray(mediaOrList) ? mediaOrList[0] : mediaOrList
      ) as MediaRecord | undefined
      if (!media) return

      if (!media.mime?.startsWith('image/')) {
        toast.error(t('contentEdit.invalidMediaFile', { mediaType: 'Image' }))
        return
      }

      const src = await resolveImageSrc(media, managerClient.request)
      if (!src) {
        toast.error(t('richText.insertImageError'))
        return
      }

      activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, {
        src,
        alt: media.alt || media.title || media.name || '',
        mediaId: media._id,
      })
      activeEditor.focus()
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('richText.insertImageError')))
    } finally {
      setLoading(false)
    }
  }, [activeEditor, loading, managerClient.request, openMediaLibrary, t])

  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      className='!h-8 !w-8'
      aria-label={t('richText.insertImage')}
      title={t('richText.insertImage')}
      loading={loading}
      onClick={() => void insertImageFromLibrary()}
    >
      <ImageIcon className='h-4 w-4' />
    </Button>
  )
}
