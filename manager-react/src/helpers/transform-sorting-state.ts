import type { SortingState } from '@tanstack/react-table'

export const transformSortingState = (sorting: SortingState) =>
  Object.fromEntries(
    sorting.map(({ id, desc }) => [id, desc ? 'desc' : 'asc']),
  ) as Record<string, 'asc' | 'desc'>
