import type { ManagerTour } from '@/help/types'

export const managerDashboardTour: ManagerTour = {
  id: 'manager.dashboard',
  route: 'dashboard-home',
  title: 'Dashboard',
  description: 'A quick look at the manager shell.',
  steps: [
    {
      target: '[data-tour="manager-sidebar"]',
      title: 'Navigation',
      description: 'Use the sidebar to move between content, tools, and settings.',
      side: 'right',
    },
    {
      target: '[data-tour="manager-header"]',
      title: 'Current location',
      description: 'The header shows the current path and keeps global controls close.',
      side: 'bottom',
    },
    {
      target: '[data-tour="manager-help"]',
      title: 'Contextual help',
      description: 'This button starts the help tour for whichever page you are viewing.',
      side: 'right',
    },
  ],
}
