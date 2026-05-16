import type { ManagerTour } from '@/help/types'

export const managerContentEditTour: ManagerTour = {
  id: 'manager.content.edit',
  route: 'content-edit',
  title: 'Edit content',
  description: 'Update an existing entry safely.',
  steps: [
    {
      target: '[data-tour="content-edit-tabs"]',
      title: 'Sections',
      description: 'Use tabs to move between fields, SEO, layout modules, and versions.',
      side: 'bottom',
    },
    {
      target: '[data-tour="content-edit-visibility"]',
      title: 'Visibility',
      description: 'Draft, hide, publish, or trash content when visibility is enabled.',
      side: 'bottom',
    },
    {
      target: '[data-tour="content-edit-save"]',
      title: 'Save changes',
      description: 'Save validates the whole form and highlights sections with errors.',
      side: 'left',
    },
    {
      target: '[data-tour="content-edit-fields"]',
      title: 'Editable fields',
      description: 'Edit fields here. Required and invalid values show inline feedback.',
      side: 'top',
    },
  ],
}
