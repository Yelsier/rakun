import type { ManagerTour } from '@/help/types'

export const managerSettingsLiteralsTour: ManagerTour = {
  id: 'manager.settings.literals',
  route: 'settings-literals',
  title: 'Literals',
  description: 'Manage interface and application copy.',
  steps: [
    {
      target: '[data-tour="literals-toolbar"]',
      title: 'Search and filters',
      description: 'Find literals by key, value, namespace, or language.',
      side: 'bottom',
    },
    {
      target: '[data-tour="literals-list"]',
      title: 'Literal values',
      description: 'Edit translations and save changes from this list.',
      side: 'top',
    },
  ],
}
