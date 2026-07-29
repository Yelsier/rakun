'use client'

import type { EncodedContentType, MaybeTranslatableValue } from '@rakun-kit/core/client'
import { Fragment, useMemo } from 'react'

import { useManagerQuery } from '@/client/react'
import { useTranslations } from '@/i18n'
import { ManagerLink } from '@/link'
import type { ManagerResolvedRoute } from '@/router/shared/types'
import { useLanguage } from '@/state/language'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from './ui/breadcrumb'

import { decodeCamelCase } from '../helpers/decode-camel-case'

export default function BreadcrumbComponent({
  basePath = '',
  pathname = '',
  route,
}: {
  basePath?: string
  pathname?: string
  route?: ManagerResolvedRoute
}) {
  const { getTranslation } = useLanguage()
  const t = useTranslations()
  const contentTypesQuery = useManagerQuery({
    name: 'manager.contentTypes',
    input: undefined,
  })
  const contentTypesByName = useMemo(() => {
    const map = new Map<string, EncodedContentType>()
    for (const type of (contentTypesQuery.data as EncodedContentType[] | undefined) ?? []) {
      map.set(type.name, type)
    }
    return map
  }, [contentTypesQuery.data])
  const editRoute = route?.kind === 'content-edit' ? route : undefined
  const documentQuery = useManagerQuery({
    name: 'manager.get',
    input: editRoute
      ? {
          contentType: editRoute.contentType,
          id: editRoute.id,
        }
      : ({
          contentType: '',
          id: '',
        } as never),
    enabled: Boolean(editRoute),
  })
  const paths = useMemo(
    () => pathname.split('/').filter((path) => path !== ''),
    [pathname],
  )
  const document = documentQuery.data as
    | { title?: MaybeTranslatableValue<string> }
    | undefined
  const translatedTitle = document?.title
    ? getTranslation(document.title)
    : undefined
  const editLabel =
    typeof translatedTitle === 'string' && translatedTitle.trim()
      ? translatedTitle.trim()
      : undefined

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className='hidden md:block'>
          <BreadcrumbLink asChild>
            <ManagerLink href={basePath}>{t('nav.dashboard')}</ManagerLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {paths.map((part, index) => {
          const href = '/' + paths.slice(0, index + 1).join('/')
          const contentType = contentTypesByName.get(part)
          const menuTitle = contentType?.menu?.title
          const label =
            editRoute &&
            index === paths.length - 1 &&
            part === editRoute.id &&
            editLabel
              ? editLabel
              : menuTitle
                ? t(menuTitle)
                : decodeCamelCase(part)

          return (
            <Fragment key={index}>
              <BreadcrumbSeparator className='hidden md:block' />
              <BreadcrumbItem key={index}>
                <BreadcrumbLink asChild>
                  <ManagerLink href={href}>{label}</ManagerLink>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
