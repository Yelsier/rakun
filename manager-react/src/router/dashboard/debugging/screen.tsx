import { Network, ScrollText, ShieldCheck } from 'lucide-react'
import type { Permission } from '@rakun-kit/core/client'
import type { ReactNode } from 'react'

import { ManagerLink } from '@/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTranslations, type ManagerMessageKey } from '@/i18n'
import { useSession } from '@/state/session'

const cards: Array<{
  titleKey: ManagerMessageKey
  icon: ReactNode
  link: string
  tour: string
  permission?: Permission
}> = [
  {
    titleKey: 'sidebar.apiRoutes',
    icon: <Network size="80" />,
    link: '/debugging/api-routes',
    tour: 'debugging-link-api-routes',
    permission: 'content.ApiOperation.readAny',
  },
  {
    titleKey: 'settings.logs',
    icon: <ScrollText size="80" />,
    link: '/debugging/logs',
    tour: 'debugging-link-logs',
    permission: 'system.eventLog.read',
  },
  {
    titleKey: 'settings.security',
    icon: <ShieldCheck size="80" />,
    link: '/debugging/security',
    tour: 'debugging-link-security',
    permission: 'auth.ipBlocks.manage',
  },
]

export const ManagerDebuggingHomeScreen = () => {
  const t = useTranslations()
  const { hasPermissions } = useSession()
  const visibleCards = cards.filter(
    (card) => !card.permission || hasPermissions([card.permission]),
  )
  return (
    <div className="container mx-auto grid grid-cols-1 gap-4 py-10 sm:grid-cols-3 xl:grid-cols-6">
      {visibleCards.map((card) => (
        <Card key={card.titleKey} data-tour={card.tour}>
          <CardContent className="flex flex-col items-center justify-center gap-4 px-8">
            {card.icon}
            <Button asChild>
              <ManagerLink href={card.link} className="text-lg font-semibold">
                {t(card.titleKey)}
              </ManagerLink>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
