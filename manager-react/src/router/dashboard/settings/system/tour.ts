import type { ManagerTour } from '@/help/types'

export const managerSettingsSystemTour: ManagerTour = {
  id: 'manager.settings.system',
  route: 'settings-system',
  title: 'System',
  description: 'Inspect backups and migration state.',
  steps: [
    {
      target: '[data-tour="system-backups"]',
      title: 'Backups',
      description: 'Create and restore database backups when you have permission.',
      side: 'top',
    },
    {
      target: '[data-tour="system-migrations"]',
      title: 'Migrations',
      description: 'Review schema state and migration history.',
      side: 'top',
    },
  ],
}
