import {
  Command,
  HelpCircle,
  Images,
  type LucideIcon,
  Network,
  Settings,
  User,
} from 'lucide-react'
import type { EncodedContentType } from '@rakun-kit/core/client'
import * as React from 'react'

import { ManagerLink } from '@/link'
import { getManagerPathHref, getManagerRouteHref } from '@/state/navigation'
import { NavMain } from './nav-main'
import { NavSecondary } from './nav-secondary'
import { NavUser } from './nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar'

export type ManagerSidebarItem = {
  title: string
  url: string
  icon?: LucideIcon
}

const getDefaultSecondaryNavItems = (basePath: string): ManagerSidebarItem[] => [
  {
    title: 'Media Library',
    url: getManagerPathHref('/media', { basePath }),
    icon: Images,
  },
  {
    title: 'Users',
    url: getManagerPathHref('/users', { basePath }),
    icon: User,
  },
  {
    title: 'API Routes',
    url: getManagerPathHref('/api-routes', { basePath }),
    icon: Network,
  },
  {
    title: 'Settings',
    url: getManagerPathHref('/settings', { basePath }),
    icon: Settings,
  },
  {
    title: 'Help',
    url: getManagerPathHref('/help', { basePath }),
    icon: HelpCircle,
  },
]

export function AppSidebar({
  contentTypes,
  basePath = '',
  secondaryItems = getDefaultSecondaryNavItems(basePath),
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  contentTypes: EncodedContentType[]
  basePath?: string
  secondaryItems?: ManagerSidebarItem[]
}) {
  return (
    <Sidebar variant='inset' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' asChild>
              <ManagerLink href={basePath}>
                <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
                  <Command className='size-4' />
                </div>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-medium'>CMS</span>
                  <span className='truncate text-xs'>Enterprise</span>
                </div>
              </ManagerLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain
          items={contentTypes
            .filter((type) => type.menu)
            .map((type) => ({
              title: type.menu?.title || '',
              url: getManagerRouteHref(
                {
                  name: 'content.list',
                  contentType: type.name,
                },
                { basePath },
              ),
            }))}
        />
        <NavSecondary items={secondaryItems} className='mt-auto' />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
