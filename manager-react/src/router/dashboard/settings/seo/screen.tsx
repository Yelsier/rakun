'use client'

import type { EncodedContentType, Permission } from '@rakun-kit/core/client'
import { Search } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { useTranslations } from '@/i18n'

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
import { useSession } from '@/state/session'

const SEO_SETTINGS_CONTENT_TYPE = 'SeoSettings'

type SeoSettingsRecord = Record<string, FieldValue> & {
  _id?: string
  _type: typeof SEO_SETTINGS_CONTENT_TYPE
  key: string
}

const defaultSeoSettingsData: SeoSettingsRecord = {
  _type: SEO_SETTINGS_CONTENT_TYPE,
  key: 'default',
}

const createSeoSettingsEditContentType = (
  encoded: EncodedContentType,
): EncodedContentType => {
  const { key: _key, ...fields } = encoded.fields

  return {
    ...encoded,
    fields,
  }
}

export const ManagerSettingsSeoScreen = () => {
  const t = useTranslations()
  const formRef = useRef<FieldRef>(null)
  const { hasPermissions } = useSession()
  const canRead = hasPermissions(['content.SeoSettings.readAny' as Permission])
  const canUpdate = hasPermissions(['content.SeoSettings.updateAny' as Permission])
  const contentTypeQuery = useManagerQuery({
    name: 'manager.contentType',
    input: {
      contentType: SEO_SETTINGS_CONTENT_TYPE,
    },
    enabled: canRead,
  })
  const contentType = useMemo(
    () =>
      contentTypeQuery.data
        ? createSeoSettingsEditContentType(
            contentTypeQuery.data as EncodedContentType,
          )
        : null,
    [contentTypeQuery.data],
  )
  const settingsListQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: SEO_SETTINGS_CONTENT_TYPE,
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
      contentType: SEO_SETTINGS_CONTENT_TYPE,
      id: settingsId ?? '',
    },
    enabled: canRead && Boolean(settingsId),
  })
  const createMutation = useManagerMutation('manager.create')
  const updateMutation = useManagerMutation('manager.update')
  const defaultData = (settingsQuery.data ??
    defaultSeoSettingsData) as SeoSettingsRecord
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
      toast.error(t('settings.seo.fixErrors'))
      return
    }

    const data = {
      ...value,
      _type: SEO_SETTINGS_CONTENT_TYPE,
      key: 'default',
    }

    try {
      if (settingsId) {
        await updateMutation.mutateAsync({
          contentType: SEO_SETTINGS_CONTENT_TYPE,
          id: settingsId,
          data,
        })
      } else {
        await createMutation.mutateAsync({
          contentType: SEO_SETTINGS_CONTENT_TYPE,
          data,
        })
      }

      toast.success(t('settings.seo.saved'))
      await settingsListQuery.refetch()
      if (settingsId) {
        await settingsQuery.refetch()
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('settings.seo.saveError'),
      )
    }
  }

  if (!canRead) {
    return (
      <UnauthorizedMessage
        neededPermission={['content.SeoSettings.readAny' as Permission]}
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
            <Search className='h-5 w-5' />
            {t('settings.seo')}
          </CardTitle>
          <CardDescription>
            {t('settings.seo.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-col gap-8'>
          <ContentTypeEdit
            key={settingsId ?? 'new'}
            id={SEO_SETTINGS_CONTENT_TYPE}
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
              {t('settings.seo.save')}
            </Button>
          ) : (
            <UnauthorizedMessage
              neededPermission={['content.SeoSettings.updateAny' as Permission]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
