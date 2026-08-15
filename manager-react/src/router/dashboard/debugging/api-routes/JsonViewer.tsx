'use client'

import { ChevronRight } from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getEntries = (value: Record<string, unknown>) =>
  Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value)

const formatPrimitive = (value: unknown) => {
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'

  return String(value)
}

const JsonNode = ({
  name,
  value,
  depth,
  isLast = true,
}: {
  name?: string
  value: unknown
  depth: number
  isLast?: boolean
}) => {
  const entries = isObject(value) ? getEntries(value) : []
  const expandable = entries.length > 0
  const array = Array.isArray(value)
  const openToken = array ? '[' : '{'
  const closeToken = array ? ']' : '}'
  const suffix = isLast ? '' : ','
  const collapsedToken = `${openToken}...${closeToken}${suffix}`
  const nameLabel = name === undefined ? null : (
    <>
      <span className="text-foreground">{JSON.stringify(name)}</span>
      <span className="text-muted-foreground">: </span>
    </>
  )

  if (!expandable) {
    const emptyCollection = isObject(value) ? `${openToken}${closeToken}` : null

    return (
      <div className="flex min-w-0 pl-5">
        <span className="min-w-0 break-words">
          {nameLabel}
          <span className="text-primary">{emptyCollection ?? formatPrimitive(value)}</span>
          <span className="text-muted-foreground">{suffix}</span>
        </span>
      </div>
    )
  }

  return (
    <Collapsible defaultOpen={depth === 0}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="group flex w-full min-w-0 items-center rounded-sm text-left hover:bg-muted/60"
        >
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
          <span className="min-w-0 break-words">
            {nameLabel}
            <span className="text-muted-foreground group-data-[state=open]:hidden">
              {collapsedToken}
            </span>
            <span className="hidden text-muted-foreground group-data-[state=open]:inline">
              {openToken}
            </span>
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-2 border-l border-border pl-3">
          {entries.map(([key, child], index) => (
            <JsonNode
              key={key}
              name={key}
              value={child}
              depth={depth + 1}
              isLast={index === entries.length - 1}
            />
          ))}
        </div>
        <div className="pl-5 text-muted-foreground">
          {closeToken}
          {suffix}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function JsonViewer({
  value,
  className,
}: {
  value: unknown
  className?: string
}) {
  return (
    <div
      className={cn(
        'bg-muted/40 min-h-64 overflow-auto rounded-xl border p-4 font-mono text-xs leading-6',
        className,
      )}
    >
      <JsonNode value={value} depth={0} />
    </div>
  )
}
