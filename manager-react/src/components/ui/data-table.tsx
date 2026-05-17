'use client'

import type {
  ColumnDef,
  Row,
  RowSelectionState,
  SortingState,
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { cva } from 'class-variance-authority'
import type { Dispatch, SetStateAction } from 'react'

import { ScrollArea, ScrollBar } from './scroll-area'
import { useSidebar } from './sidebar'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  sorting?: SortingState
  setSorting?: Dispatch<SetStateAction<SortingState>>
  rowSelection?: RowSelectionState
  setRowSelection?: Dispatch<SetStateAction<RowSelectionState>>
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string
}

const tableStyle = cva('flex pb-4', {
  variants: {
    open: {
      true: 'max-w-[calc(100vw-32px)] md:max-w-[calc(100vw-18em)]',
      false: 'md:max-w-[calc(100vw-32px)]',
    },
  },
})

export function DataTable<TData, TValue>({
  columns,
  data,
  sorting,
  setSorting,
  rowSelection,
  setRowSelection,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getRowId,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: Boolean(setRowSelection),
    state: {
      sorting,
      rowSelection,
    },
    getCoreRowModel: getCoreRowModel(),
  })

  const { open } = useSidebar()

  return (
    <ScrollArea className={tableStyle({ open })}>
      <div>
        <div className='overflow-hidden rounded-lg border'>
          <Table className='table-fixed min-w-150'>
            <TableHeader className='bg-accent'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-24 text-center'
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <ScrollBar orientation='horizontal' />
    </ScrollArea>
  )
}
