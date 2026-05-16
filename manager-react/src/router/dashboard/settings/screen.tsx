import { Database, Languages, Route, UserRoundKey, WholeWord, Waypoints } from 'lucide-react'

import { ManagerLink } from '@/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const cards = [
  {
    title: 'Languages',
    icon: <Languages size="80" />,
    link: '/settings/languages',
    tour: 'settings-link-languages',
  },
  {
    title: 'Routes',
    icon: <Route size="80" />,
    link: '/settings/routes',
    tour: 'settings-link-routes',
  },
  {
    title: 'System',
    icon: <Database size="80" />,
    link: '/settings/system',
    tour: 'settings-link-system',
  },
  {
    title: 'User Roles',
    icon: <UserRoundKey size="80" />,
    link: '/settings/user-roles',
    tour: 'settings-link-user-roles',
  },
  {
    title: 'Literals',
    icon: <WholeWord size="80" />,
    link: '/settings/literals',
    tour: 'settings-link-literals',
  },
  {
    title: 'Redirects',
    icon: <Waypoints size="80" />,
    link: '/settings/redirects',
    tour: 'settings-link-redirects',
  },
]

export const ManagerSettingsHomeScreen = () => {
  return (
    <div className="container mx-auto grid grid-cols-1 gap-4 py-10 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.title} data-tour={card.tour}>
          <CardContent className="flex flex-col items-center justify-center gap-4 px-8">
            {card.icon}
            <Button asChild>
              <ManagerLink href={card.link} className="text-lg font-semibold">
                {card.title}
              </ManagerLink>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
