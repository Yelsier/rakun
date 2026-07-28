'use client'

import type { MaybeTranslatableValue } from '@rakun-kit/core/client'
import { Fragment, useMemo } from 'react'

import { useManagerQuery } from '@/client/react'
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
            <ManagerLink href={basePath}>Dashboard</ManagerLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {paths.map((part, index) => {
          const href = '/' + paths.slice(0, index + 1).join('/')
          const label =
            editRoute &&
            index === paths.length - 1 &&
            part === editRoute.id &&
            editLabel
              ? editLabel
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
