import type { ManagerResolvedRoute } from '@/router/shared/types'

export type ManagerTourStep = {
  target: string
  title: string
  description: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

export type ManagerTour = {
  id: string
  title: string
  description: string
  route: ManagerResolvedRoute['kind'] | ManagerResolvedRoute['kind'][]
  steps: ManagerTourStep[]
}
