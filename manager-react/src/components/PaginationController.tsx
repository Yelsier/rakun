import type { Dispatch, SetStateAction } from 'react'

import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

export const PaginationController: React.FC<{
  page: number
  setPage: Dispatch<SetStateAction<number>>
  totalItems: number
  itemsPerPage: number
}> = ({ page, setPage, totalItems, itemsPerPage }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const ellipsis = () => {
    return (
      <PaginationItem>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size={'icon'}>
              <PaginationEllipsis />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-fit">
            <div>
              <Label>
                <span className="whitespace-nowrap">Go to page:</span>{' '}
                <Input
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseInt(e.currentTarget.value)
                      if (!isNaN(val)) {
                        setPage(Math.min(totalPages, Math.max(1, val)))
                      }
                    }
                  }}
                  type="number"
                  min={1}
                  max={totalPages}
                  className="w-20"
                />
              </Label>
            </div>
          </PopoverContent>
        </Popover>
      </PaginationItem>
    )
  }

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem
          className="cursor-pointer select-none"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          <PaginationPrevious />
        </PaginationItem>
        {totalPages > 3 && page > 2 && ellipsis()}
        {page > 1 && (
          <PaginationItem
            className="cursor-pointer select-none"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <PaginationLink>{page - 1}</PaginationLink>
          </PaginationItem>
        )}
        <PaginationItem>
          <PaginationLink isActive>{page}</PaginationLink>
        </PaginationItem>
        {page < totalPages && (
          <PaginationItem
            className="cursor-pointer select-none"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <PaginationLink>{page + 1}</PaginationLink>
          </PaginationItem>
        )}
        {totalPages > 3 && page < totalPages - 1 && ellipsis()}
        <PaginationItem
          className="cursor-pointer select-none"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          <PaginationNext />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
