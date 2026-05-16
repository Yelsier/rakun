import type { ManagerTour } from '@/help/types'

export const managerSettingsRoutesTour: ManagerTour = {
  id: 'manager.settings.routes',
  route: 'settings-routes',
  title: 'Routes',
  description: 'Configure route definitions and layout behavior.',
  steps: [
    {
      target: '[data-tour="routes-create"]',
      title: 'Create routes',
      description: 'Add managed routes when the API allows route editing.',
      side: 'left',
    },
    {
      target: '[data-tour="routes-table"]',
      title: 'Route list',
      description: 'Review path mappings and edit route configuration.',
      side: 'top',
    },
  ],
}
