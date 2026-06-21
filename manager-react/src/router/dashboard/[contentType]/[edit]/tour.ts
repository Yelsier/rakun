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
      description: 'Use tabs to move between info, content, SEO, layout modules, and versions.',
      side: 'bottom',
    },
    {
      target: '[data-tour="content-edit-visibility"]',
      title: 'Visibility',
      description: 'Choose whether this entry is draft, hidden, or published.',
      side: 'bottom',
    },
    {
      target: '[data-tour="content-edit-save"]',
      title: 'Save changes',
      description: 'Save validates the whole form. When available, the arrow lets you save as draft.',
      side: 'left',
    },
    {
      target: '[data-tour="content-edit-actions"]',
      title: 'More actions',
      description:
        'Open this menu to favorite, translate, preview, move to trash, restore, or delete.',
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
