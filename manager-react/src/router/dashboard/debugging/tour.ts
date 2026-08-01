import type { ManagerTour } from '@/help/types'

export const managerDebuggingTour = {
  id: 'manager.debugging',
  title: 'Debugging',
  description: 'Inspect API operations, event logs, and login security.',
  route: 'debugging-home',
  steps: [
    {
      target: '[data-tour="debugging-link-api-routes"]',
      title: 'API Routes',
      description:
        'Browse manager and custom API operations, inspect schemas, and try requests.',
      side: 'bottom',
      align: 'center',
    },
    {
      target: '[data-tour="debugging-link-logs"]',
      title: 'Logs',
      description:
        'Inspect operational events and filter them by type, outcome, severity, or source.',
      side: 'bottom',
      align: 'center',
    },
    {
      target: '[data-tour="debugging-link-security"]',
      title: 'Security',
      description:
        'Review blocked login IPs and recent failed authentication attempts.',
      side: 'bottom',
      align: 'center',
    },
  ],
} satisfies ManagerTour
