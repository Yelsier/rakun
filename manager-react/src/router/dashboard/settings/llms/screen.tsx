'use client'

import type { EncodedContentType, Permission } from '@rakun-kit/core/client'
import { BotMessageSquare } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { toast } from 'sonner'

import ContentTypeEdit, {
  type FieldRef,
} from '../../[contentType]/[edit]/ContentTypeEdit'
import type { FieldValue } from '../../[contentType]/[edit]/_fields/shared'

import { useManagerMutation, useManagerQuery } from '@/client/react'
import Loading from '@/components/loading'
import UnauthorizedMessage from '@/components/unauthorized'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTranslations } from '@/i18n'
import { useSession } from '@/state/session'

const LLMS_SETTINGS_CONTENT_TYPE = 'LlmsSettings'

type LlmsSettingsRecord = Record<string, FieldValue> & {
  _id?: string
  _type: typeof LLMS_SETTINGS_CONTENT_TYPE
  key: string
}

const defaultLlmsSettingsData: LlmsSettingsRecord = {
  _type: LLMS_SETTINGS_CONTENT_TYPE,
  key: 'default',
  llmsEnabled: false,
  llmsSections: [],
}

const createLlmsSettingsEditContentType = (
  encoded: EncodedContentType,
): EncodedContentType => {
  const { key: _key, ...fields } = encoded.fields

  return {
    ...encoded,
    fields,
  }
}

export const ManagerSettingsLlmsScreen = () => {
  const t = useTranslations()
  const formRef = useRef<FieldRef>(null)
  const { hasPermissions } = useSession()
  const canRead = hasPermissions(['content.LlmsSettings.readAny' as Permission])
  const canUpdate = hasPermissions(['content.LlmsSettings.updateAny' as Permission])
  const contentTypeQuery = useManagerQuery({
    name: 'manager.contentType',
    input: { contentType: LLMS_SETTINGS_CONTENT_TYPE },
    enabled: canRead,
  })
  const contentType = useMemo(
    () =>
      contentTypeQuery.data
        ? createLlmsSettingsEditContentType(
            contentTypeQuery.data as EncodedContentType,
          )
        : null,
    [contentTypeQuery.data],
  )
  const settingsListQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: LLMS_SETTINGS_CONTENT_TYPE,
      query: {
        filter: { key: 'default' },
        options: { limit: 1, fields: ['key'] },
      },
    },
    enabled: canRead,
  })
  const settingsId = (
    settingsListQuery.data?.items?.[0] as { _id?: string } | undefined
  )?._id
  const settingsQuery = useManagerQuery({
    name: 'manager.get',
    input: {
      contentType: LLMS_SETTINGS_CONTENT_TYPE,
      id: settingsId ?? '',
    },
    enabled: canRead && Boolean(settingsId),
  })
  const createMutation = useManagerMutation('manager.create')
  const updateMutation = useManagerMutation('manager.update')
  const defaultData = (settingsQuery.data ??
    defaultLlmsSettingsData) as LlmsSettingsRecord
  const isLoading =
    contentTypeQuery.isLoading ||
    settingsListQuery.isLoading ||
    (Boolean(settingsId) && settingsQuery.isLoading)
  const isSaving = createMutation.isPending || updateMutation.isPending

  const saveSettings = async () => {
    const value = formRef.current?.getValue() as
      | ({ _error?: string } & Record<string, unknown>)
      | undefined

    if (!value || value._error) {
      toast.error(t('settings.llms.fixErrors'))
      return
    }

    const data = {
      ...value,
      _type: LLMS_SETTINGS_CONTENT_TYPE,
      key: 'default',
    }

    try {
      if (settingsId) {
        await updateMutation.mutateAsync({
          contentType: LLMS_SETTINGS_CONTENT_TYPE,
          id: settingsId,
          data,
        })
      } else {
        await createMutation.mutateAsync({
          contentType: LLMS_SETTINGS_CONTENT_TYPE,
          data,
        })
      }

      toast.success(t('settings.llms.saved'))
      await settingsListQuery.refetch()
      if (settingsId) await settingsQuery.refetch()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('settings.llms.saveError'),
      )
    }
  }

  if (!canRead) {
    return (
      <UnauthorizedMessage
        neededPermission={['content.LlmsSettings.readAny' as Permission]}
      />
    )
  }

  if (isLoading) return <Loading />
  if (!contentType) return null

  return (
    <div className='container mx-auto flex flex-col gap-6 px-4 py-10'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <BotMessageSquare className='h-5 w-5' />
            {t('settings.llms.title')}
          </CardTitle>
          <CardDescription>{t('settings.llms.description')}</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-8'>
          <ContentTypeEdit
            key={settingsId ?? 'new'}
            id={LLMS_SETTINGS_CONTENT_TYPE}
            ref={formRef}
            contentType={contentType}
            defaultData={defaultData}
            collapsible
          />
          {canUpdate ? (
            <Button
              className='w-fit'
              loading={isSaving}
              onClick={() => void saveSettings()}
            >
              {t('settings.llms.save')}
            </Button>
          ) : (
            <UnauthorizedMessage
              neededPermission={[
                'content.LlmsSettings.updateAny' as Permission,
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
