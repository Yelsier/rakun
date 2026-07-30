import {
  Bot,
  Database,
  Languages,
  Route,
  Search,
  UserRoundKey,
  GitPullRequestArrow,
  WholeWord,
  Waypoints,
  ScrollText,
} from 'lucide-react'
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
    titleKey: 'settings.reviewPolicies',
    icon: <GitPullRequestArrow size="80" />,
    link: '/settings/review-policies',
    tour: 'settings-link-review-policies',
    permission: 'review.policy.configure',
  },
  {
    titleKey: 'settings.languages',
    icon: <Languages size="80" />,
    link: '/settings/languages',
    tour: 'settings-link-languages',
  },
  {
    titleKey: 'settings.routes',
    icon: <Route size="80" />,
    link: '/settings/routes',
    tour: 'settings-link-routes',
  },
  {
    titleKey: 'settings.logs',
    icon: <ScrollText size="80" />,
    link: '/settings/logs',
    tour: 'settings-link-logs',
  },
  {
    titleKey: 'settings.system',
    icon: <Database size="80" />,
    link: '/settings/system',
    tour: 'settings-link-system',
  },
  {
    titleKey: 'settings.userRoles',
    icon: <UserRoundKey size="80" />,
    link: '/settings/user-roles',
    tour: 'settings-link-user-roles',
  },
  {
    titleKey: 'settings.literals',
    icon: <WholeWord size="80" />,
    link: '/settings/literals',
    tour: 'settings-link-literals',
  },
  {
    titleKey: 'settings.redirects',
    icon: <Waypoints size="80" />,
    link: '/settings/redirects',
    tour: 'settings-link-redirects',
  },
  {
    titleKey: 'settings.robots',
    icon: <Bot size="80" />,
    link: '/settings/robots',
    tour: 'settings-link-robots',
  },
  {
    titleKey: 'settings.seo',
    icon: <Search size="80" />,
    link: '/settings/seo',
    tour: 'settings-link-seo',
  },
]

export const ManagerSettingsHomeScreen = () => {
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
