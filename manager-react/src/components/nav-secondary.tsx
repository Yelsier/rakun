import { type LucideIcon } from 'lucide-react'
import * as React from 'react'

import { ManagerLink } from '@/link'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar'

const activeMenuClass =
  'data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm data-[active=true]:hover:bg-primary/90 data-[active=true]:hover:text-primary-foreground data-[active=true]:[&>svg]:text-primary-foreground'

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    disabled?: boolean
    onClick?: () => void
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const content = (
              <>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </>
            )

            return (
              <SidebarMenuItem key={item.title}>
                {item.onClick ? (
                  <SidebarMenuButton
                    size="sm"
                    isActive={item.isActive}
                    className={activeMenuClass}
                    disabled={item.disabled}
                    onClick={item.onClick}
                    data-tour={item.title === 'Help' ? 'manager-help' : undefined}
                  >
                    {content}
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    asChild
                    size="sm"
                    isActive={item.isActive}
                    className={activeMenuClass}
                  >
                    <ManagerLink href={item.url}>{content}</ManagerLink>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
