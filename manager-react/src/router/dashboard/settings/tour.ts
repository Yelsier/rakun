import type { ManagerTour } from '@/help/types'

export const managerSettingsTour = {
  id: 'manager.settings',
  title: 'Settings',
  description: 'Main configuration areas for the manager.',
  route: 'settings-home',
  steps: [
    {
      target: '[data-tour="settings-link-languages"]',
      title: 'Languages',
      description:
        'Manage available languages and localization setup for multilingual content.',
      side: 'bottom',
      align: 'center',
    },
    {
      target: '[data-tour="settings-link-routes"]',
      title: 'Routes',
      description:
        'Configure routable content types and how entries map to public URLs.',
      side: 'bottom',
      align: 'center',
    },
    {
      target: '[data-tour="settings-link-system"]',
      title: 'System',
      description:
        'Review backups, schema state, migrations, and operational system tools.',
      side: 'bottom',
      align: 'center',
    },
    {
      target: '[data-tour="settings-link-user-roles"]',
      title: 'User Roles',
      description:
        'Create roles and decide which manager permissions each role grants.',
      side: 'bottom',
      align: 'center',
    },
    {
      target: '[data-tour="settings-link-literals"]',
      title: 'Literals',
      description:
        'Edit reusable interface or site text values without changing code.',
      side: 'top',
      align: 'center',
    },
    {
      target: '[data-tour="settings-link-redirects"]',
      title: 'Redirects',
      description:
        'Create URL redirects for moved pages, legacy links, or SEO changes.',
      side: 'top',
      align: 'center',
    },
  ],
} satisfies ManagerTour
