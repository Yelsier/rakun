import type { ManagerTour } from '@/help/types'

export const managerSettingsRedirectsTour: ManagerTour = {
  id: 'manager.settings.redirects',
  route: 'settings-redirects',
  title: 'Redirects',
  description: 'Create and test redirect rules.',
  steps: [
    {
      target: '[data-tour="redirects-create"]',
      title: 'Create redirect',
      description: 'Add a redirect rule for old paths, marketing links, or migrations.',
      side: 'left',
    },
    {
      target: '[data-tour="redirects-table"]',
      title: 'Redirect rules',
      description: 'Review status codes, source patterns, conditions, and destinations.',
      side: 'top',
    },
  ],
}
