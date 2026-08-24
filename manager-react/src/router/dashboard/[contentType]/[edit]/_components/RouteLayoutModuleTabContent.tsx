'use client'

import { Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import type {
  RouteLayoutModuleOverrideRecord,
  RouteLayoutModuleRecord,
} from '../edit.types'
import { useEditPageContext } from '../_context/EditPageContext'

import { useManagerMutation } from '@/client/react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TabsContent } from '@/components/ui/tabs'
import { translateLayoutModuleLabel, useTranslations } from '@/i18n'
import { useOptionalManagerNavigation } from '@/state/navigation'

const getLayoutOverrideValue = (override?: RouteLayoutModuleOverrideRecord) => {
  if (!override) return '__default__'
  return override.moduleId && override.moduleId.length > 0 ? override.moduleId : '__none__'
}

export const RouteLayoutModuleTabContent = ({
  layoutModule,
}: {
  layoutModule: RouteLayoutModuleRecord
}) => {
  const t = useTranslations()
  const navigation = useOptionalManagerNavigation()
  const { activeTab, contentTypeId, contentTypeName, routeLayout } =
    useEditPageContext()
  const override = routeLayout.overridesByKey.get(`${layoutModule.routeId}:${layoutModule.key}`)
  const options = routeLayout.layoutOptionsByContentType.get(layoutModule.contentType) ?? []
  const [selected, setSelected] = useState(() => getLayoutOverrideValue(override))
  const [isSaving, setIsSaving] = useState(false)
  const setOverrideMutation = useManagerMutation(
    'manager.routeLayout.setOverride',
  )

  useEffect(() => {
    setSelected(getLayoutOverrideValue(override))
  }, [override])

  const saveLayoutOverride = async (layoutModule: RouteLayoutModuleRecord, selected: string) => {
    if (!contentTypeId) return

    setIsSaving(true)

    try {
      await setOverrideMutation.mutateAsync({
        contentType: contentTypeName,
        contentTypeId,
        routeId: layoutModule.routeId,
        key: layoutModule.key,
        moduleId:
          selected === '__default__'
            ? null
            : selected === '__none__'
              ? ''
              : selected,
      })

      await routeLayout.routeLayoutOverridesQuery.refetch()
      toast.success(t('contentEdit.layoutOverrideUpdated'))
    } finally {
      setIsSaving(false)
    }
  }

  const defaultOption = layoutModule.moduleId
    ? (options.find((option) => option.value === layoutModule.moduleId)?.label ??
      layoutModule.moduleId)
    : t('contentEdit.noModule')
  const layoutModuleLabel = translateLayoutModuleLabel(
    t,
    layoutModule.key,
    layoutModule.contentType,
  )
  const selectedModuleId =
    selected === '__default__'
      ? layoutModule.moduleId
      : selected === '__none__'
        ? undefined
        : selected

  const editSelectedModule = () => {
    if (!selectedModuleId || !navigation?.push) return

    navigation.push({
      name: 'content.edit',
      contentType: layoutModule.contentType,
      id: selectedModuleId,
    })
  }

  return (
    <TabsContent
      value={`layout:${layoutModule._id}`}
      forceMount
      hidden={activeTab !== `layout:${layoutModule._id}`}
      className='w-full'
      data-rakun-manager-layout-key={layoutModule.key}
      data-rakun-manager-tab-panel={`layout:${layoutModule._id}`}
    >
      <div className='mx-auto flex w-full flex-col gap-4'>
        <div>
          <h2 className='text-lg font-semibold'>{layoutModuleLabel}</h2>
          <p className='text-muted-foreground text-sm'>
            {t('contentEdit.defaultFromRoute')} {defaultOption}
            {t('contentEdit.overrideOnlyForEntry')}
          </p>
        </div>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue placeholder={t('contentEdit.selectModule')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__default__'>{t('contentEdit.useRouteDefault')}</SelectItem>
            <SelectItem value='__none__'>{t('contentEdit.noModule')}</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            loading={isSaving}
            onClick={() => saveLayoutOverride(layoutModule, selected)}
          >
            {t('contentEdit.saveOverride')}
          </Button>
          <Button
            type='button'
            variant='outline'
            disabled={!selectedModuleId || !navigation?.push}
            onClick={editSelectedModule}
          >
            <Pencil />
            {t('contentEdit.editSelectedModule')}
          </Button>
        </div>
      </div>
    </TabsContent>
  )
}
