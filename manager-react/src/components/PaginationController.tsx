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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

const itemsPerPageOptions = [10, 25, 50, 100]

export const PaginationController: React.FC<{
  page: number
  setPage: Dispatch<SetStateAction<number>>
  totalItems: number
  itemsPerPage: number
  setItemsPerPage?: Dispatch<SetStateAction<number>>
}> = ({ page, setPage, totalItems, itemsPerPage, setItemsPerPage }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const firstItem = totalItems === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const lastItem = Math.min(page * itemsPerPage, totalItems)

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
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Pagination className="mx-0 w-auto justify-start">
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
      <div className="flex flex-wrap items-center gap-3 self-end text-muted-foreground text-sm sm:self-auto">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap">Items per page</span>
          <Select
            value={String(itemsPerPage)}
            disabled={!setItemsPerPage}
            onValueChange={(value) => {
              setItemsPerPage?.(Number(value))
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {itemsPerPageOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="whitespace-nowrap tabular-nums">
          {firstItem}-{lastItem} of {totalItems}
        </span>
      </div>
    </div>
  )
}
