import {
  Command,
  HelpCircle,
  Images,
  Network,
  Settings,
  User,
  type LucideIcon,
} from 'lucide-react'
import type { EncodedContentType, Permission } from '@rakun-kit/core/client'
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
import { useManagerPlugins } from '@/plugins'
import { getEncodedContentPermissions } from '@/state/permissions'
import { useSession } from '@/state/session'
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
  permissions?: readonly Permission[]
  permissionMode?: 'all' | 'any'
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
    permissions: ['content.Media.readAny', 'content.Media.own'],
    permissionMode: 'any',
  },
  {
    title: 'Users',
    url: getManagerPathHref('/users', { basePath }),
    icon: User,
    permissions: ['content.ManagerUser.readAny'],
  },
  {
    title: 'API Routes',
    url: getManagerPathHref('/api-routes', { basePath }),
    icon: Network,
    permissions: ['content.ApiOperation.readAny'],
  },
  {
    title: 'Settings',
    url: getManagerPathHref('/settings', { basePath }),
    icon: Settings,
    permissions: [
      'review.policy.configure',
      'content.Language.own',
      'content.Language.readAny',
      'content.Route.own',
      'content.Route.readAny',
      'content.Backup.readAny',
      'content.Migration.readAny',
      'content.ManagerRole.own',
      'content.ManagerRole.readAny',
      'content.LiteralTranslation.readAny',
      'content.Redirect.readAny',
      'content.RobotsRule.readAny',
      'content.SeoSettings.readAny',
    ],
    permissionMode: 'any',
  },
]

const getContentTypeNavItems = (
  contentTypes: EncodedContentType[],
  basePath: string,
  hasAnyPermission: (permissions: Permission[]) => boolean,
  pathname?: string,
): ManagerSidebarItem[] => {
  const items: ManagerSidebarItem[] = []
  const categories = new Map<string, ManagerSidebarItem>()

  for (const type of contentTypes) {
    if (!type.menu) continue

    const readPermissions = getEncodedContentPermissions(type, [
      'own',
      'readAny',
    ])
    if (readPermissions.length > 0 && !hasAnyPermission(readPermissions)) {
      continue
    }

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

const filterSidebarItems = (
  items: ManagerSidebarItem[],
  hasPermissions: (permissions: Permission[]) => boolean,
  hasAnyPermission: (permissions: Permission[]) => boolean,
): ManagerSidebarItem[] =>
  items.flatMap((item) => {
    const permissions = [...(item.permissions ?? [])]
    const allowed =
      permissions.length === 0 ||
      (item.permissionMode === 'any'
        ? hasAnyPermission(permissions)
        : hasPermissions(permissions))

    if (!allowed) return []

    if (!item.items) return [item]

    const visibleItems = filterSidebarItems(
      item.items,
      hasPermissions,
      hasAnyPermission,
    )

    return visibleItems.length > 0
      ? [{ ...item, items: visibleItems }]
      : []
  })

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
  const pluginRegistry = useManagerPlugins()
  const { hasPermissions, hasAnyPermission } = useSession()
  const contentTypeItems = getContentTypeNavItems(
    contentTypes,
    basePath,
    hasAnyPermission,
    pathname,
  )
  const helpItem: ManagerSidebarItem = {
    title: 'Help',
    url: '#',
    icon: HelpCircle,
    disabled: !hasCurrentTour,
    onClick: startCurrentTour,
  }
  const pluginItems = pluginRegistry.sidebar
    .flatMap((item) => {
      const route = item.routeId
        ? pluginRegistry.routesById.get(`${item.pluginId}:${item.routeId}`)
        : undefined
      if (item.routeId && !route) {
        throw new Error(
          `Rakun manager sidebar item "${item.pluginId}:${item.id}" references unknown route "${item.routeId}".`,
        )
      }
      if (route?.path.includes(':')) {
        throw new Error(
          `Rakun manager sidebar item "${item.pluginId}:${item.id}" cannot target parameterized route "${route.path}".`,
        )
      }

      const rawHref = route?.path ?? item.href
      if (!rawHref) {
        throw new Error(
          `Rakun manager sidebar item "${item.pluginId}:${item.id}" must define href or routeId.`,
        )
      }
      const external = /^(?:[a-z]+:|#)/i.test(rawHref)
      const url = external
        ? rawHref
        : getManagerPathHref(rawHref, { basePath })
      const permissions = [
        ...(route?.permissions ?? []),
        ...(item.permissions ?? []),
      ]

      if (permissions.length > 0 && !hasPermissions(permissions)) {
        return []
      }

      return [
        {
          ...item,
          url,
          isActive: external ? false : isActiveHref(url, pathname, basePath),
        },
      ]
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const primaryPluginGroups = pluginItems
    .filter((item) => (item.position ?? 'secondary') === 'primary')
    .reduce((groups, item) => {
      const group = item.group ?? 'Plugins'
      const items = groups.get(group) ?? []
      items.push(item)
      groups.set(group, items)
      return groups
    }, new Map<string, typeof pluginItems>())
  const secondaryPluginItems = pluginItems.filter(
    (item) => (item.position ?? 'secondary') === 'secondary',
  )

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
        {contentTypeItems.length > 0 ? (
          <NavMain items={contentTypeItems} />
        ) : null}
        {Array.from(primaryPluginGroups, ([label, items]) => (
          <NavMain key={label} label={label} items={items} />
        ))}
        <NavSecondary
          items={filterSidebarItems(
            [...secondaryItems, ...secondaryPluginItems, helpItem],
            hasPermissions,
            hasAnyPermission,
          ).map((item) => ({
            ...item,
            isActive:
              'onClick' in item && item.onClick
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
