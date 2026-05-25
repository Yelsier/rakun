'use client'

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

const getLayoutOverrideValue = (override?: RouteLayoutModuleOverrideRecord) => {
  if (!override) return '__default__'
  return override.moduleId && override.moduleId.length > 0 ? override.moduleId : '__none__'
}

export const RouteLayoutModuleTabContent = ({
  layoutModule,
}: {
  layoutModule: RouteLayoutModuleRecord
}) => {
  const { activeTab, contentTypeId, routeLayout } = useEditPageContext()
  const override = routeLayout.overridesByKey.get(`${layoutModule.routeId}:${layoutModule.key}`)
  const options = routeLayout.layoutOptionsByContentType.get(layoutModule.contentType) ?? []
  const [selected, setSelected] = useState(() => getLayoutOverrideValue(override))
  const [isSaving, setIsSaving] = useState(false)
  const createOverrideMutation = useManagerMutation('manager.create')
  const updateOverrideMutation = useManagerMutation('manager.update')
  const deleteOverrideMutation = useManagerMutation('manager.delete')

  useEffect(() => {
    setSelected(getLayoutOverrideValue(override))
  }, [override])

  const saveLayoutOverride = async (layoutModule: RouteLayoutModuleRecord, selected: string) => {
    if (!contentTypeId) return

    setIsSaving(true)

    try {
      const existing = routeLayout.overridesByKey.get(`${layoutModule.routeId}:${layoutModule.key}`)

      if (selected === '__default__') {
        if (existing) {
          await deleteOverrideMutation.mutateAsync({
            contentType: 'RouteLayoutModuleOverride',
            id: existing._id,
          })
          await routeLayout.routeLayoutOverridesQuery.refetch()
        }

        toast.success('Layout override updated successfully')
        return
      }

      const payload = {
        _type: 'RouteLayoutModuleOverride' as const,
        routeId: layoutModule.routeId,
        routeKey: layoutModule.routeKey,
        contentTypeId,
        key: layoutModule.key,
        contentType: layoutModule.contentType,
        moduleId: selected === '__none__' ? '' : selected,
      }

      if (existing) {
        await updateOverrideMutation.mutateAsync({
          contentType: 'RouteLayoutModuleOverride',
          id: existing._id,
          data: payload,
        })
      } else {
        await createOverrideMutation.mutateAsync({
          contentType: 'RouteLayoutModuleOverride',
          data: payload,
        })
      }

      await routeLayout.routeLayoutOverridesQuery.refetch()
      toast.success('Layout override updated successfully')
    } finally {
      setIsSaving(false)
    }
  }

  const defaultOption = layoutModule.moduleId
    ? (options.find((option) => option.value === layoutModule.moduleId)?.label ??
      layoutModule.moduleId)
    : 'No module'

  return (
    <TabsContent
      value={`layout:${layoutModule._id}`}
      forceMount
      hidden={activeTab !== `layout:${layoutModule._id}`}
      className='w-full'
    >
      <div className='mx-auto flex w-full flex-col gap-4'>
        <div>
          <h2 className='text-lg font-semibold'>{layoutModule.contentType}</h2>
          <p className='text-muted-foreground text-sm'>
            Default from route: {defaultOption}. Override only for this entry.
          </p>
        </div>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue placeholder='Select module' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__default__'>Use route default</SelectItem>
            <SelectItem value='__none__'>No module</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className='w-fit'
          loading={isSaving}
          onClick={() => saveLayoutOverride(layoutModule, selected)}
        >
          Save override
        </Button>
      </div>
    </TabsContent>
  )
}
