import type { ManagerTour } from '@/help/types'

export const managerSettingsRoutePathsTour: ManagerTour = {
  id: 'manager.settings.route-paths',
  route: 'settings-route-paths',
  title: 'Route Paths',
  description: 'Inspect generated route paths.',
  steps: [
    {
      target: '[data-tour="route-paths-regenerate"]',
      title: 'Regenerate routes',
      description:
        "Refresh generated route maps. Routes are automatically updated when the content associated with them is changed, but you can use this to force an update if something didn't update as expected.",
      side: 'left',
    },
    {
      target: '[data-tour="route-paths-table"]',
      title: 'Generated paths',
      description: 'Review the route map entries used by the frontend.',
      side: 'top',
    },
  ],
}
