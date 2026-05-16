import type { ManagerTour } from '@/help/types'

export const managerContentListTour: ManagerTour = {
  id: 'manager.content.list',
  route: 'content-list',
  title: 'Content list',
  description: 'Browse and manage entries for this content type.',
  steps: [
    {
      target: '[data-tour="content-list-create"]',
      title: 'Create content',
      description: 'Add a new entry for this content type.',
      side: 'left',
    },
    {
      target: '[data-tour="content-list-table"]',
      title: 'Entries',
      description: 'Sort, open, trash, restore, or delete entries from the table.',
      side: 'top',
    },
  ],
}
