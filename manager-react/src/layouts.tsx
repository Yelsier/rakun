'use client'

import type { EncodedContentType } from '@rakun-kit/core/client'
import type { ReactNode } from 'react'
import type { ManagerResolvedRoute } from './router/shared/types'

import { AppSidebar, type ManagerSidebarItem } from './components/app-sidebar'
import BreadcrumbComponent from './components/bread-crumb'
import { Separator } from './components/ui/separator'
import { ManagerHelpProvider } from './help/manager-help'
import {
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from './components/ui/sidebar'
import { ScrollArea } from './components/ui/scroll-area'

export type ManagerLayoutContext = {
  pathname?: string
  contentTypes?: EncodedContentType[]
}

export type ManagerLayoutRendererProps = {
  children: ReactNode
  route: { kind: string }
  pathname?: string
  basePath?: string
  contentTypes?: EncodedContentType[]
  headerEnd?: ReactNode
}

export type ManagerAuthLayoutProps = {
  children: ReactNode
}

export const ManagerAuthLayout = ({ children }: ManagerAuthLayoutProps) => (
  <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
    <div className="w-full max-w-sm">{children}</div>
  </div>
)

export type ManagerDashboardLayoutProps = {
  children: ReactNode
  route?: ManagerResolvedRoute
  contentTypes: EncodedContentType[]
  pathname?: string
  basePath?: string
  secondaryItems?: ManagerSidebarItem[]
  sidebar?: ReactNode
  headerStart?: ReactNode
  headerEnd?: ReactNode
}

export const ManagerDashboardLayout = ({
  children,
  route,
  contentTypes,
  pathname,
  basePath = '',
  secondaryItems,
  sidebar,
  headerStart,
  headerEnd,
}: ManagerDashboardLayoutProps) => (
  <SidebarProvider className="max-h-screen overflow-hidden">
    <ManagerHelpProvider route={route ?? { kind: 'unknown', pathname: pathname ?? '/' }}>
      {sidebar ?? (
        <AppSidebar
          contentTypes={contentTypes}
          pathname={pathname}
          basePath={basePath}
          secondaryItems={secondaryItems}
        />
      )}
      <SidebarInset className="p-4 pt-0">
        <SidebarHeader
          className="flex h-16 shrink-0 flex-row items-center justify-between gap-2"
          data-tour="manager-header"
        >
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            {headerStart ?? <BreadcrumbComponent basePath={basePath} pathname={pathname} />}
          </div>
          {headerEnd}
        </SidebarHeader>

        <ScrollArea className="h-[calc(100vh-5rem)]" data-tour="manager-page">
          {children}
        </ScrollArea>
      </SidebarInset>
    </ManagerHelpProvider>
  </SidebarProvider>
)
