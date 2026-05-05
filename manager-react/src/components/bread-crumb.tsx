'use client'

import { Fragment, useMemo } from 'react'

import { ManagerLink } from '@/link'
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
}: {
  basePath?: string
  pathname?: string
}) {
  const paths = useMemo(
    () => pathname.split('/').filter((path) => path !== ''),
    [pathname],
  )

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
          return (
            <Fragment key={index}>
              <BreadcrumbSeparator className='hidden md:block' />
              <BreadcrumbItem key={index}>
                <BreadcrumbLink asChild>
                  <ManagerLink href={href}>{decodeCamelCase(part)}</ManagerLink>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
