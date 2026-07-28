'use client'

import type { Column, ColumnDef, Row, RowSelectionState, SortingState } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { type Dispatch, type SetStateAction, useEffect, useRef } from 'react'

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

const selectColumnWidth = 44
const idColumnWidth = 120
const actionColumnWidth = 56
const defaultColumnWidth = 176

const fadeBaseClassName =
  'pointer-events-none absolute inset-y-0 z-10 w-10 pb-4 opacity-0 transition-opacity duration-150'
const fadeVisibleClassName = 'opacity-100'

const getColumnWidth = <TData, TValue>(column: Column<TData, TValue>) => {
  if (column.id === 'select') return selectColumnWidth
  if (column.id === 'actions' || column.id === 'view') return actionColumnWidth
  if (column.id === 'id' || column.id === '_id' || column.id.endsWith('Id')) {
    return idColumnWidth
  }

  if (column.columnDef.size) return column.columnDef.size

  return defaultColumnWidth
}

const useHorizontalScrollOverflow = (contentKey: string | number) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const leftFadeRef = useRef<HTMLDivElement>(null)
  const rightFadeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = scrollRef.current
    const leftFade = leftFadeRef.current
    const rightFade = rightFadeRef.current
    if (!element || !leftFade || !rightFade) return

    const updateOverflow = () => {
      const { clientWidth, scrollLeft, scrollWidth } = element
      const maxScrollLeft = scrollWidth - clientWidth

      leftFade.classList.toggle(fadeVisibleClassName, scrollLeft > 1)
      rightFade.classList.toggle(
        fadeVisibleClassName,
        maxScrollLeft > 1 && scrollLeft < maxScrollLeft - 1
      )
    }

    updateOverflow()

    element.addEventListener('scroll', updateOverflow, { passive: true })
    const resizeObserver = new ResizeObserver(updateOverflow)
    resizeObserver.observe(element)

    const firstChild = element.firstElementChild
    if (firstChild) resizeObserver.observe(firstChild)

    window.addEventListener('resize', updateOverflow)

    return () => {
      element.removeEventListener('scroll', updateOverflow)
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateOverflow)
    }
  }, [contentKey])

  return { scrollRef, leftFadeRef, rightFadeRef }
}

export function DataTable<TData, TValue>({
  columns,
  data,
  sorting,
  setSorting,
  rowSelection,
  setRowSelection,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const state = {
    ...(sorting !== undefined ? { sorting } : {}),
    ...(rowSelection !== undefined ? { rowSelection } : {}),
  }

  const table = useReactTable({
    data,
    columns,
    getRowId,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: Boolean(setRowSelection),
    state,
    getCoreRowModel: getCoreRowModel(),
  })
  const rows = table.getRowModel().rows
  const leafColumns = table.getAllLeafColumns()
  const tableWidth = leafColumns.reduce((width, column) => width + getColumnWidth(column), 0)
  const { scrollRef, leftFadeRef, rightFadeRef } = useHorizontalScrollOverflow(
    `${tableWidth}:${leafColumns.length}:${rows.length}`
  )

  return (
    <div className="relative w-full max-w-full min-w-0">
      <div
        ref={scrollRef}
        className="w-full max-w-full min-w-0 overflow-x-auto pb-4 [contain:inline-size]"
      >
        <div
          className="w-max min-w-full overflow-hidden rounded-lg border"
          style={{ width: tableWidth }}
        >
          <Table className="table-fixed" style={{ minWidth: tableWidth }}>
            <colgroup>
              {leafColumns.map((column) => (
                <col
                  key={column.id}
                  style={{ minWidth: getColumnWidth(column), width: getColumnWidth(column) }}
                />
              ))}
            </colgroup>
            <TableHeader className="bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows?.length ? (
                rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                    {row?.getVisibleCells()?.map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div
        ref={leftFadeRef}
        aria-hidden
        className={`${fadeBaseClassName} left-0 bg-gradient-to-r from-background to-transparent`}
      />
      <div
        ref={rightFadeRef}
        aria-hidden
        className={`${fadeBaseClassName} right-0 bg-gradient-to-l from-background to-transparent`}
      />
    </div>
  )
}
