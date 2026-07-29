'use client'
import { ChevronRight, type LucideIcon } from 'lucide-react'

import { ManagerLink } from '@/link'
import { useTranslations } from '@/i18n'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from './ui/sidebar'

const activeMenuClass =
  'data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm data-[active=true]:hover:bg-primary/90 data-[active=true]:hover:text-primary-foreground data-[active=true]:[&>svg]:text-primary-foreground'

const closedCategoryActiveMenuClass =
  'data-[state=closed]:data-[active=true]:bg-primary data-[state=closed]:data-[active=true]:text-primary-foreground data-[state=closed]:data-[active=true]:shadow-sm data-[state=closed]:data-[active=true]:hover:bg-primary/90 data-[state=closed]:data-[active=true]:hover:text-primary-foreground data-[state=closed]:data-[active=true]:[&>svg]:text-primary-foreground'

export function NavMain({
  items,
  label,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
      icon?: LucideIcon
      isActive?: boolean
    }[]
  }[]
  label?: string
}) {
  const t = useTranslations()
  const resolvedLabel = label ?? t('sidebar.contentTypes')
  const totalItems = items.reduce(
    (total, item) => total + (item.items?.length ?? 1),
    0,
  )

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        {t('navMain.groupLabel', { label: resolvedLabel, count: totalItems })}
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive ?? Boolean(item.items?.length)}
          >
            <SidebarMenuItem className='group/collapsible'>
              {item.items?.length ? (
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={item.isActive}
                    className={closedCategoryActiveMenuClass}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className='ms-auto transition-transform group-data-[state=open]/collapsible:rotate-90' />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              ) : (
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={item.isActive}
                  className={activeMenuClass}
                >
                  <ManagerLink href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </ManagerLink>
                </SidebarMenuButton>
              )}
              {item.items?.length ? (
                <>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={subItem.isActive}
                            className={activeMenuClass}
                          >
                            <ManagerLink href={subItem.url}>
                              {subItem.icon && <subItem.icon />}
                              {subItem.title}
                            </ManagerLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
