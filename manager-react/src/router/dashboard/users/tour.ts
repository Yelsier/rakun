import type { ManagerTour } from '@/help/types'

export const managerUsersTour: ManagerTour = {
  id: 'manager.users',
  route: 'users',
  title: 'Users',
  description: 'Manage manager users and their access.',
  steps: [
    {
      target: '[data-tour="users-create"]',
      title: 'Create users',
      description: 'Add new manager users when you need to invite someone.',
      side: 'left',
    },
    {
      target: '[data-tour="users-table"]',
      title: 'User list',
      description: 'Review users, edit their details, or remove access.',
      side: 'top',
    },
  ],
}
