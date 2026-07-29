'use client'

import type { RouteSchema } from '@rakun-kit/core/internal-content-types'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { getListField } from '@rakun-kit/core/client'
import { isTranslatableObject } from '@rakun-kit/core/client'
import { LinkfieldValue } from '@rakun-kit/core/client'

import type { LinkPropsRef } from '.'
import { errorStyle } from '../../edit.styles'
import { useFieldValues } from '../shared'
import { FieldWrapper } from '../shared/FieldWrapper'

import Loading from '@/components/loading'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/lib/providers/language/LanguageClientProvider'
import { useTRPC } from '@/components/trpc-provider'
import { useTranslations } from '@/i18n'

const RouteSelect: React.FC<{
  value: LinkfieldValue
  onValueChange: (value: LinkfieldValue) => void
  error?: string | null
  isRequired?: boolean
  setRoutes: (routes: RouteSchema[]) => void
  dynamicFallbackPlaceholder?: string
}> = ({
  value,
  onValueChange,
  error,
  isRequired,
  setRoutes,
  dynamicFallbackPlaceholder,
}) => {
  const t = useTranslations()
  const trpc = useTRPC()
  const { data } = useQuery(
    trpc.manager.list.queryOptions({
      contentType: 'Route',
      query: {
        options: {
          limit: 'all',
        },
      },
    }),
  )

  useEffect(() => {
    const queryData = data as { items?: RouteSchema[] } | undefined
    if (queryData?.items) {
      setRoutes(queryData.items as RouteSchema[])
      }
  }, [data, setRoutes])

  if (!data) {
    return <Loading />
  }

  const routes = ((data as { items?: RouteSchema[] } | undefined)?.items ??
    []) as RouteSchema[]

  return (
    <div className='flex gap-2'>
      <Label className='flex flex-col items-start'>
        {t('contentEdit.route')}
        <div className='flex gap-2'>
          {!isRequired && value.routeId && (
            <Button
              onClick={() => onValueChange({ routeId: '', contentTypeId: '' })}
              variant={'ghost'}
              size={'icon'}
            >
              <X />
            </Button>
          )}
          <Select
            value={value.routeId}
            onValueChange={(routeId) =>
              onValueChange({ contentTypeId: '', routeId })
            }
          >
            <SelectTrigger className={errorStyle({ error: !!error })}>
              <SelectValue
                placeholder={dynamicFallbackPlaceholder ?? 'Select a Route'}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{t('contentEdit.routes')}</SelectLabel>
                {routes.map((route) => (
                  <SelectItem key={route.contentType} value={route._id}>
                    {route.contentType} - {route.field}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </Label>
    </div>
  )
}

const ItemSelect: React.FC<{
  routes: RouteSchema[]
  value: LinkfieldValue
  onValueChange: (value: LinkfieldValue) => void
  error?: string | null
  isRequired?: boolean
  dynamicFallbackPlaceholder?: string
}> = ({
  routes,
  value,
  onValueChange,
  error,
  isRequired,
  dynamicFallbackPlaceholder,
}) => {
  const t = useTranslations()
  const { language } = useLanguage()
  const trpc = useTRPC()
  const { data, refetch, isFetching } = useQuery(
    trpc.manager.list.queryOptions({
      contentType: routes
        ? routes.find((route: RouteSchema) => route._id === value.routeId)
            ?.contentType || 'Route'
        : 'Route',
      query: {
        options: {
          limit: 'all',
        },
      },
    }),
  )

  const { data: contentTypesData } = useQuery(
    trpc.manager.contentTypes.queryOptions(),
  )

  useEffect(() => {
    refetch()
  }, [value.routeId])

  if (!data || !contentTypesData) {
    return <Loading />
  }

  const route = routes.find((r) => r._id === value.routeId)

  const contentTypeList = (contentTypesData ?? []) as Array<{ name: string; listFields?: string[] }>
  const contentType = contentTypeList.find(
    (ct) => ct.name === route?.contentType,
  )

  const items = ((data as { items?: Array<Record<string, unknown> & { _id: string }> } | undefined)
    ?.items ?? []) as Array<Record<string, unknown> & { _id: string }>

  return isFetching ? (
    <Loading />
  ) : (
    route && contentType && (
      <div className='flex gap-2'>
        <Label className='flex flex-col items-start'>
          {t('common.item')}
          <div className='flex gap-2'>
            {!isRequired && value.contentTypeId && (
              <Button
                onClick={() => onValueChange({ ...value, contentTypeId: '' })}
                variant={'ghost'}
                size={'icon'}
              >
                <X />
              </Button>
            )}
            <Select
              value={value.contentTypeId}
              onValueChange={(contentTypeId) =>
                onValueChange({ ...value, contentTypeId })
              }
            >
              <SelectTrigger className={errorStyle({ error: !!error })}>
                <SelectValue
                  placeholder={dynamicFallbackPlaceholder ?? 'Select an Item'}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{t('common.items')}</SelectLabel>
                  {items.map((item) => {
                    const field = getListField(
                      item,
                      contentType.listFields || [],
                    )
                    return (
                      <SelectItem key={item._id} value={item._id}>
                        {isTranslatableObject(field)
                          ? field[language.code]
                          : field}
                      </SelectItem>
                    )
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </Label>
      </div>
    )
  )
}

const LinkUI: React.FC<LinkPropsRef> = ({ id, ref, ...props }) => {
  const { value, errors, onValueChange, getValue, getState } =
    useFieldValues<LinkfieldValue>({
      id,
      isRequired: props.isRequired,
      isTranslatable: props.isTranslatable,
      defaultData: props.defaultData as LinkfieldValue,
      defaultValue: {
        contentTypeId: '',
        routeId: '',
      },
      validateValue: (value) => {
        if (!value.contentTypeId && props.isRequired) {
          return 'Content type is required'
        }

        if (value.routeId && !value.contentTypeId) {
          return 'Item is required'
        }

        return null
      },
    })

  const [routes, setRoutes] = useState<RouteSchema[]>([])

  const error = errors.find((e) => e.id === id)?.error

  return (
    <FieldWrapper
      id={id}
      errors={errors}
      getValue={getValue}
      getState={getState}
      ref={ref}
    >
      <div className='flex gap-4'>
        <RouteSelect
          value={value}
          onValueChange={onValueChange}
          error={error}
          isRequired={props.isRequired}
          setRoutes={setRoutes}
          dynamicFallbackPlaceholder={props.dynamicFallbackPlaceholder}
        />
        <ItemSelect
          routes={routes}
          value={value}
          onValueChange={onValueChange}
          error={error}
          isRequired={props.isRequired}
          dynamicFallbackPlaceholder={props.dynamicFallbackPlaceholder}
        />
      </div>
    </FieldWrapper>
  )
}

export default LinkUI
