'use client'

import type {
  ColumnDef,
  ColumnSizingState,
  Header,
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
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { flushSync } from 'react-dom'

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
const idColumnWidth = 140
const createdByColumnWidth = 160
const visibilityColumnWidth = 110
const variantCountColumnWidth = 88
const actionColumnWidth = 56
const defaultColumnWidth = 180
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
  if (columnId === 'createdBy') return createdByColumnWidth
  if (columnId === 'visibility') return visibilityColumnWidth
  if (columnId === '_variantCount') return variantCountColumnWidth
  return defaultColumnWidth
}

const isFixedWidthColumn = (columnId: string | undefined) =>
  columnId === 'select' || columnId === 'actions' || columnId === 'view'

/** Compact columns keep a fixed px budget. Content columns size to their cells. */
const isCompactColumn = (columnId: string | undefined) => {
  if (!columnId || isFixedWidthColumn(columnId)) return true
  if (
    columnId === 'id' ||
    columnId === '_id' ||
    columnId.endsWith('Id') ||
    columnId === 'createdBy' ||
    columnId === 'visibility' ||
    columnId === '_variantCount'
  ) {
    return true
  }
  return false
}

/** Content-sized layout until the user resizes; then every column is an explicit
 *  px width driven by CSS variables on the table (so the body can stay memoized). */
const getContentColumnStyle = (
  columnId: string,
  size: number,
): CSSProperties => {
  if (isCompactColumn(columnId)) {
    if (
      columnId === 'id' ||
      columnId === '_id' ||
      columnId.endsWith('Id')
    ) {
      return {
        width: size,
        minWidth: size,
      }
    }

    return {
      width: size,
      minWidth: size,
      maxWidth: size,
    }
  }

  return {
    width: 'auto',
    minWidth: defaultMinColumnWidth,
  }
}

const getLockedColumnStyle = (columnId: string): CSSProperties => ({
  width: `calc(var(--col-${columnId}-size) * 1px)`,
  minWidth: `calc(var(--col-${columnId}-size) * 1px)`,
  ...(isFixedWidthColumn(columnId)
    ? { maxWidth: `calc(var(--col-${columnId}-size) * 1px)` }
    : {}),
})

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
  sizingLocked,
}: {
  table: TanStackTable<TData>
  columnCount: number
  emptyLabel: string
  sizingLocked: boolean
  /** Compared by memo — do not read mutable table.options.data in the comparer. */
  data: TData[]
  columnIdsKey: string
  columnSizing: ColumnSizingState
  isResizing: boolean
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
              style={
                sizingLocked
                  ? getLockedColumnStyle(cell.column.id)
                  : getContentColumnStyle(
                      cell.column.id,
                      cell.column.getSize(),
                    )
              }
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  )
}

/** Stable component type so resize never remounts the body. While dragging,
 *  skip re-renders — widths flow through CSS variables on <table>.
 *
 *  Compare React-owned props only. TanStack mutates a stable table instance, so
 *  reading `table.options.data` in the comparer always sees the latest value on
 *  both prev/next and freezes the body after the first lock. */
const MemoizedDataTableBody = memo(
  DataTableBody,
  (prev, next) => {
    if (next.isResizing) {
      return (
        prev.data === next.data &&
        prev.columnIdsKey === next.columnIdsKey &&
        prev.sizingLocked === next.sizingLocked
      )
    }

    return (
      prev.data === next.data &&
      prev.columnIdsKey === next.columnIdsKey &&
      prev.sizingLocked === next.sizingLocked &&
      prev.columnSizing === next.columnSizing
    )
  },
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
  const tableWrapperRef = useRef<HTMLDivElement>(null)
  const columnSizingRef = useRef<ColumnSizingState>({})
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
  columnSizingRef.current = columnSizing

  const resizableColumns = useMemo(
    () => withResizableDefaults(columns),
    [columns],
  )
  const columnIdsKey = useMemo(
    () =>
      resizableColumns
        .map((column) => getColumnId(column) ?? '')
        .join('\0'),
    [resizableColumns],
  )

  useEffect(() => {
    setColumnSizing((previous) =>
      Object.keys(previous).length === 0 ? previous : {},
    )
  }, [columnIdsKey])

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

  const leafColumns = table.getAllLeafColumns()
  const sizingLocked = Object.keys(columnSizing).length > 0
  const isResizingColumn = Boolean(
    table.getState().columnSizingInfo.isResizingColumn,
  )
  const useFixedLayout = sizingLocked || isResizingColumn
  const totalSize = table.getTotalSize()
  const contentKey = `${leafColumns.length}:${data.length}:${sizingLocked}:${useFixedLayout ? totalSize : 'auto'}`
  const { scrollRef, leftFadeRef, rightFadeRef } =
    useHorizontalScrollOverflow(contentKey)

  const columnSizeVars = useMemo(() => {
    const headers = table.getFlatHeaders()
    const colSizes: Record<string, number> = {}
    for (const header of headers) {
      colSizes[`--header-${header.id}-size`] = header.getSize()
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize()
    }
    return colSizes
  }, [table.getState().columnSizingInfo, table.getState().columnSizing])

  /** Freeze live content-sized widths before table-fixed / TanStack sizing take
   *  over, otherwise the first drag frame redistributes columns. */
  const lockRenderedColumnSizes = useCallback(() => {
    if (Object.keys(columnSizingRef.current).length > 0) return

    const root = tableWrapperRef.current?.querySelector('table')
    if (!root) return

    const headerCells = root.querySelectorAll<HTMLElement>(
      '[data-slot="table-header"] th',
    )
    if (!headerCells.length) return

    const nextSizing: ColumnSizingState = {}
    leafColumns.forEach((column, index) => {
      const width = headerCells[index]?.getBoundingClientRect().width
      if (width && Number.isFinite(width)) {
        nextSizing[column.id] = Math.max(
          column.columnDef.minSize ?? defaultMinColumnWidth,
          Math.round(width),
        )
      }
    })

    if (Object.keys(nextSizing).length) {
      flushSync(() => {
        setColumnSizing(nextSizing)
      })
    }
  }, [leafColumns])

  const getResizeHandler = useCallback(
    (header: Header<TData, unknown>) => {
      const resize = header.getResizeHandler()
      return (event: unknown) => {
        lockRenderedColumnSizes()
        resize(event)
      }
    },
    [lockRenderedColumnSizes],
  )

  /** Once columns are locked to px widths, size the table to their sum — not
   *  `width: 100%`. A percentage width redistributes leftover space across every
   *  column when one is resized (especially the last), so the whole table jumps. */
  const tableStyle = {
    ...columnSizeVars,
    ...(useFixedLayout
      ? { width: totalSize, minWidth: totalSize }
      : { width: '100%' }),
  } as CSSProperties

  return (
    <div className='relative w-full max-w-full min-w-0'>
      <div
        ref={scrollRef}
        className='w-full max-w-full min-w-0 overflow-x-auto pb-4 [contain:inline-size]'
      >
        <div
          ref={tableWrapperRef}
          className={cn(
            'min-w-full overflow-hidden rounded-lg border',
            useFixedLayout ? 'w-full' : 'w-max',
          )}
          style={useFixedLayout ? { minWidth: totalSize } : undefined}
        >
          <Table
            className={cn(useFixedLayout ? 'table-fixed' : 'w-full')}
            containerClassName='overflow-visible'
            style={tableStyle}
          >
            <colgroup>
              {leafColumns.map((column) => (
                <col
                  key={column.id}
                  style={
                    useFixedLayout
                      ? getLockedColumnStyle(column.id)
                      : getContentColumnStyle(column.id, column.getSize())
                  }
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
                      style={
                        useFixedLayout
                          ? {
                              width: `calc(var(--header-${header.id}-size) * 1px)`,
                              minWidth: `calc(var(--header-${header.id}-size) * 1px)`,
                            }
                          : getContentColumnStyle(
                              header.column.id,
                              header.getSize(),
                            )
                      }
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
                          onDoubleClick={() => {
                            header.column.resetSize()
                            setColumnSizing({})
                          }}
                          onMouseDown={getResizeHandler(header)}
                          onTouchStart={getResizeHandler(header)}
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
            <MemoizedDataTableBody
              table={table}
              columnCount={columns.length}
              emptyLabel={t('dataTable.noResults')}
              sizingLocked={sizingLocked}
              data={data}
              columnIdsKey={columnIdsKey}
              columnSizing={columnSizing}
              isResizing={isResizingColumn}
            />
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
