import type { ManagerTour } from '@/help/types'

export const managerApiRoutesTour: ManagerTour = {
  id: 'manager.api-routes',
  route: 'api-routes',
  title: 'API Routes',
  description: 'Inspect manager and custom API operations.',
  steps: [
    {
      target: '[data-tour="api-routes-search"]',
      title: 'Search operations',
      description: 'Filter the operation catalog by name, route, or description.',
      side: 'bottom',
    },
    {
      target: '[data-tour="api-routes-list"]',
      title: 'Operation list',
      description: 'Pick an operation to inspect its contract and test payloads.',
      side: 'right',
    },
    {
      target: '[data-tour="api-routes-detail"]',
      title: 'Contract details',
      description: 'Review inputs, outputs, access mode, and request examples.',
      side: 'left',
    },
  ],
}
