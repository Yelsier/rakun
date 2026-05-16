import type { ManagerTour } from '@/help/types'

export const managerMediaTour: ManagerTour = {
  id: 'manager.media',
  route: 'media-library',
  title: 'Media Library',
  description: 'Upload, organize, and inspect media assets.',
  steps: [
    {
      target: '[data-tour="media-toolbar"]',
      title: 'Media controls',
      description: 'Upload files, switch folders, and filter the current view from here.',
      side: 'bottom',
    },
    {
      target: '[data-tour="media-folders"]',
      title: 'Folders',
      description: 'Use folders to keep uploaded media organized.',
      side: 'right',
    },
    {
      target: '[data-tour="media-grid"]',
      title: 'Files',
      description: 'Open an item to preview it, edit metadata, or select it from a field.',
      side: 'top',
    },
  ],
}
