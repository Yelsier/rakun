import type { ManagerTour } from '@/help/types'

export const managerContentCreateTour: ManagerTour = {
  id: 'manager.content.create',
  route: 'content-create',
  title: 'Create content',
  description: 'Fill fields and save a new entry.',
  steps: [
    {
      target: '[data-tour="content-edit-tabs"]',
      title: 'Field groups',
      description: 'Switch between content, info, SEO, and layout sections.',
      side: 'bottom',
    },
    {
      target: '[data-tour="content-edit-save"]',
      title: 'Save',
      description: 'Validation runs before saving and tabs with errors are marked.',
      side: 'left',
    },
    {
      target: '[data-tour="content-edit-fields"]',
      title: 'Fields',
      description: 'Required fields are marked and show inline errors when missing.',
      side: 'top',
    },
  ],
}
