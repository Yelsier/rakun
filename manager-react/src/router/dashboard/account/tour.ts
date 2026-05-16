import type { ManagerTour } from '@/help/types'

export const managerAccountTour: ManagerTour = {
  id: 'manager.account',
  route: 'account',
  title: 'Account',
  description: 'Update your profile, security, and sessions.',
  steps: [
    {
      target: '[data-tour="account-profile"]',
      title: 'Profile',
      description: 'Edit your username and profile image shown in activity history.',
      side: 'bottom',
    },
    {
      target: '[data-tour="account-mfa"]',
      title: 'Two-factor authentication',
      description: 'Enable a second factor to protect manager access.',
      side: 'top',
    },
    {
      target: '[data-tour="account-sessions"]',
      title: 'Sessions',
      description: 'Review active sessions and revoke devices you no longer use.',
      side: 'top',
    },
  ],
}
