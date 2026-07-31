'use client'

import type {
  ColumnDef,
  ColumnSizingState,
  Row,
  RowSelectionState,
  SortingState,
  Table as TanStackTable,
} from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import {
  memo,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTranslations } from '@/i18n'
import { cn } from '@/lib/utils'

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
const defaultColumnWidth = 150
const defaultMinColumnWidth = 60
const defaultMaxColumnWidth = 800

const fadeBaseClassName =
  'pointer-events-none absolute inset-y-0 z-10 w-10 pb-4 opacity-0 transition-opacity duration-150'
const fadeVisibleClassName = 'opacity-100'

const getColumnId = <TData, TValue>(column: ColumnDef<TData, TValue>) => {
  if (column.id) return column.id
  if ('accessorKey' in column && column.accessorKey != null) {
    return String(column.accessorKey)
  }
  return undefined
}

const getDefaultColumnSize = (columnId: string | undefined) => {
  if (columnId === 'select') return selectColumnWidth
  if (columnId === 'actions' || columnId === 'view') return actionColumnWidth
  if (
    columnId === 'id' ||
    columnId === '_id' ||
    columnId?.endsWith('Id')
  ) {
    return idColumnWidth
  }
  return defaultColumnWidth
}

const isFixedWidthColumn = (columnId: string | undefined) =>
  columnId === 'select' || columnId === 'actions' || columnId === 'view'

const withResizableDefaults = <TData, TValue>(
  columns: ColumnDef<TData, TValue>[],
): ColumnDef<TData, TValue>[] =>
  columns.map((column) => {
    const columnId = getColumnId(column)
    const fixed = isFixedWidthColumn(columnId)
    const defaultSize = getDefaultColumnSize(columnId)

    return {
      ...column,
      size: column.size ?? defaultSize,
      minSize: column.minSize ?? (fixed ? defaultSize : defaultMinColumnWidth),
      maxSize: column.maxSize ?? (fixed ? defaultSize : defaultMaxColumnWidth),
      enableResizing: column.enableResizing ?? !fixed,
    }
  })

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
        maxScrollLeft > 1 && scrollLeft < maxScrollLeft - 1,
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

const DataTableBody = <TData, TValue>({
  table,
  columnCount,
  emptyLabel,
}: {
  table: TanStackTable<TData>
  columnCount: number
  emptyLabel: string
}) => {
  const rows = table.getRowModel().rows

  if (!rows.length) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={columnCount} className='h-24 text-center'>
            {emptyLabel}
          </TableCell>
        </TableRow>
      </TableBody>
    )
  }

  return (
    <TableBody>
      {rows.map((row) => (
        <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
          {row.getVisibleCells().map((cell) => (
            <TableCell
              key={cell.id}
              className='overflow-hidden'
              style={{
                width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
                minWidth: `calc(var(--col-${cell.column.id}-size) * 1px)`,
              }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  )
}

const MemoizedDataTableBody = memo(
  DataTableBody,
  (prev, next) => prev.table.options.data === next.table.options.data,
) as typeof DataTableBody

export function DataTable<TData, TValue>({
  columns,
  data,
  sorting,
  setSorting,
  rowSelection,
  setRowSelection,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const t = useTranslations()
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
  const resizableColumns = useMemo(
    () => withResizableDefaults(columns),
    [columns],
  )

  const table = useReactTable({
    data,
    columns: resizableColumns,
    getRowId,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnSizingChange: setColumnSizing,
    enableRowSelection: Boolean(setRowSelection),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    defaultColumn: {
      size: defaultColumnWidth,
      minSize: defaultMinColumnWidth,
      maxSize: defaultMaxColumnWidth,
    },
    state: {
      columnSizing,
      ...(sorting !== undefined ? { sorting } : {}),
      ...(rowSelection !== undefined ? { rowSelection } : {}),
    },
    getCoreRowModel: getCoreRowModel(),
  })

  const columnSizeVars = useMemo(() => {
    const headers = table.getFlatHeaders()
    const colSizes: Record<string, number> = {}
    for (const header of headers) {
      colSizes[`--header-${header.id}-size`] = header.getSize()
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize()
    }
    return colSizes
  }, [table.getState().columnSizingInfo, table.getState().columnSizing])

  const tableWidth = table.getTotalSize()
  const leafColumns = table.getAllLeafColumns()
  const isResizingColumn = table.getState().columnSizingInfo.isResizingColumn
  const { scrollRef, leftFadeRef, rightFadeRef } = useHorizontalScrollOverflow(
    `${tableWidth}:${leafColumns.length}:${data.length}`,
  )

  const tableStyle = {
    ...columnSizeVars,
    width: '100%',
    minWidth: tableWidth,
  } as CSSProperties

  return (
    <div className='relative w-full max-w-full min-w-0'>
      <div
        ref={scrollRef}
        className='w-full max-w-full min-w-0 overflow-x-auto pb-4 [contain:inline-size]'
      >
        <div
          className='w-full min-w-full overflow-hidden rounded-lg border'
          style={{ minWidth: tableWidth }}
        >
          <Table className='w-full table-fixed' style={tableStyle}>
            <colgroup>
              {leafColumns.map((column) => (
                <col
                  key={column.id}
                  style={{
                    width: `calc(var(--col-${column.id}-size) * 1px)`,
                    minWidth: `calc(var(--col-${column.id}-size) * 1px)`,
                  }}
                />
              ))}
            </colgroup>
            <TableHeader className='bg-muted'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className='relative overflow-hidden'
                      style={{
                        width: `calc(var(--header-${header.id}-size) * 1px)`,
                        minWidth: `calc(var(--header-${header.id}-size) * 1px)`,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                      {header.column.getCanResize() ? (
                        <div
                          role='separator'
                          aria-orientation='vertical'
                          aria-label={t('dataTable.resizeColumn')}
                          onDoubleClick={() => header.column.resetSize()}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={cn(
                            'group/resizer absolute inset-y-0 right-0 z-20 flex w-3 cursor-col-resize touch-none select-none items-center justify-center',
                            'hover:bg-primary/15',
                            header.column.getIsResizing() && 'bg-primary/20',
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'h-4 w-px rounded-full bg-border transition-colors',
                              'group-hover/resizer:bg-primary',
                              header.column.getIsResizing() && 'bg-primary',
                            )}
                          />
                        </div>
                      ) : null}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            {isResizingColumn ? (
              <MemoizedDataTableBody
                table={table}
                columnCount={columns.length}
                emptyLabel={t('dataTable.noResults')}
              />
            ) : (
              <DataTableBody
                table={table}
                columnCount={columns.length}
                emptyLabel={t('dataTable.noResults')}
              />
            )}
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
