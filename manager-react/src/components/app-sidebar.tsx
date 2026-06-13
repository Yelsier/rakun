import {
  Command,
  HelpCircle,
  Images,
  Network,
  Settings,
  User,
  type LucideIcon,
} from 'lucide-react'
import type { EncodedContentType } from '@rakun-kit/core/client'
import * as React from 'react'

import { ManagerLink } from '@/link'
import {
  getManagerPathHref,
  getManagerRelativePathname,
  getManagerRouteHref,
} from '@/state/navigation'
import { NavMain } from './nav-main'
import { NavSecondary } from './nav-secondary'
import { NavUser } from './nav-user'
import { useManagerHelp } from '@/help/manager-help'
import { resolveLucideIcon } from '@/helpers/resolve-lucide-icon'
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
  isActive?: boolean
  disabled?: boolean
  onClick?: () => void
  items?: ManagerSidebarItem[]
}

const cleanPathname = (path: string) => {
  const [pathname = ''] = path.split(/[?#]/)
  return pathname.replace(/\/+$/, '') || '/'
}

const isActiveHref = (
  href: string,
  pathname: string | undefined,
  basePath: string,
) => {
  if (!pathname || !href) return false

  const currentPath = cleanPathname(pathname)
  const itemPath = cleanPathname(getManagerRelativePathname(href, { basePath }))

  if (itemPath === '/') {
    return currentPath === '/'
  }

  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`)
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
]

const getContentTypeNavItems = (
  contentTypes: EncodedContentType[],
  basePath: string,
  pathname?: string,
): ManagerSidebarItem[] => {
  const items: ManagerSidebarItem[] = []
  const categories = new Map<string, ManagerSidebarItem>()

  for (const type of contentTypes) {
    if (!type.menu) continue

    const item = {
      title: type.menu.title,
      url: getManagerRouteHref(
        {
          name: 'content.list',
          contentType: type.name,
        },
        { basePath },
      ),
      icon: resolveLucideIcon(type.menu.icon),
      isActive: false,
    }

    item.isActive = isActiveHref(item.url, pathname, basePath)

    if (!type.menu.category) {
      items.push(item)
      continue
    }

    let category = categories.get(type.menu.category)

    if (!category) {
      category = {
        title: type.menu.category,
        url: '',
        items: [],
      }
      categories.set(type.menu.category, category)
      items.push(category)
    }

    category.items?.push(item)
    category.isActive ||= item.isActive
  }

  return items
}

export function AppSidebar({
  contentTypes,
  pathname,
  basePath = '',
  secondaryItems = getDefaultSecondaryNavItems(basePath),
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  contentTypes: EncodedContentType[]
  pathname?: string
  basePath?: string
  secondaryItems?: ManagerSidebarItem[]
}) {
  const { hasCurrentTour, startCurrentTour } = useManagerHelp()
  const helpItem: ManagerSidebarItem = {
    title: 'Help',
    url: '#',
    icon: HelpCircle,
    disabled: !hasCurrentTour,
    onClick: startCurrentTour,
  }

  return (
    <Sidebar variant='inset' data-tour="manager-sidebar" {...props}>
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
          items={getContentTypeNavItems(contentTypes, basePath, pathname)}
        />
        <NavSecondary
          items={[...secondaryItems, helpItem].map((item) => ({
            ...item,
            isActive: item.onClick
              ? false
              : isActiveHref(item.url, pathname, basePath),
          }))}
          className='mt-auto'
        />
      </SidebarContent>
      <SidebarFooter data-tour="manager-user">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
