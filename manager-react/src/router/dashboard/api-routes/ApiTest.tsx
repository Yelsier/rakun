'use client'

import { Folder, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type z from 'zod'

import { CodeBlock } from './CodeBlock'
import ApiPlayground from './test'
import {
  createDefaultInput,
  operationNameToTitle,
  stringifySchema,
} from './shared'

import {
  getManagerOperationMeta,
  managerOperationContracts,
  type ManagerOperationName,
} from '@rakun-kit/core/manager'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

type OperationDoc = {
  name: ManagerOperationName
  title: string
  description?: string
  path: string
  kind: 'query' | 'mutation'
  method: string
  access: string
  input?: z.ZodTypeAny
  output?: z.ZodTypeAny
}

type GroupNode = Record<string, GroupNode[] | OperationDoc>

const getKindBadgeVariant = (kind: OperationDoc['kind']) =>
  kind === 'query' ? 'secondary' : 'outline'

const buildDocs = (): OperationDoc[] => {
  return (Object.keys(managerOperationContracts) as ManagerOperationName[]).map(
    (name) => {
      const contract = managerOperationContracts[name]
      const meta = getManagerOperationMeta(name)

      return {
        name,
        title: operationNameToTitle(name),
        description: contract.description,
        path: meta.path,
        kind: meta.kind,
        method: meta.method.toUpperCase(),
        access: contract.access,
        input: 'input' in contract ? contract.input : undefined,
        output: contract.output,
      }
    },
  )
}

const addToTree = (items: GroupNode[], parts: string[], doc: OperationDoc) => {
  const [head, ...tail] = parts
  if (!head) return

  if (tail.length === 0) {
    items.push({ [head]: doc })
    return
  }

  const existing = items.find(
    (item) =>
      Object.prototype.hasOwnProperty.call(item, head) &&
      Array.isArray(item[head]),
  )

  if (existing) {
    addToTree(existing[head] as GroupNode[], tail, doc)
    return
  }

  const next: GroupNode = { [head]: [] }
  items.push(next)
  addToTree(next[head] as GroupNode[], tail, doc)
}

const buildTree = (docs: OperationDoc[]) => {
  const grouped: Record<string, GroupNode[]> = {}

  docs.forEach((doc) => {
    const [first, ...rest] = doc.name.split('.')
    if (!first) return
    if (!grouped[first]) grouped[first] = []
    addToTree(grouped[first], rest, doc)
  })

  return grouped
}

const getGroupEntry = (item: GroupNode) =>
  Object.entries(item)[0] as [string, GroupNode[] | OperationDoc]

const itemMatches = (doc: OperationDoc, search: string) => {
  const value = search.toLowerCase()
  return (
    doc.name.toLowerCase().includes(value) ||
    doc.path.toLowerCase().includes(value) ||
    doc.description?.toLowerCase().includes(value)
  )
}

const groupHasMatch = (items: GroupNode[], search: string): boolean => {
  if (!search) return true

  return items.some((item) => {
    const [, value] = getGroupEntry(item)
    if (Array.isArray(value)) {
      return groupHasMatch(value, search)
    }
    return itemMatches(value, search)
  })
}

const renderTree = ({
  items,
  search,
  selected,
  onSelect,
  depth = 0,
}: {
  items: GroupNode[]
  search: string
  selected: string
  onSelect: (name: string) => void
  depth?: number
}) =>
  items.flatMap((item) => {
    const [key, value] = getGroupEntry(item)

    if (Array.isArray(value)) {
      if (!groupHasMatch(value, search)) return []

      return (
        <Collapsible key={`${depth}-${key}`} defaultOpen className='block'>
          <CollapsibleTrigger asChild>
            <button
              type='button'
              style={{ marginLeft: depth * 12 }}
              className='flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
            >
              <Folder className='size-4' />
              {operationNameToTitle(key)}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className='flex flex-col gap-2'>
            {renderTree({
              items: value,
              search,
              selected,
              onSelect,
              depth: depth + 1,
            })}
          </CollapsibleContent>
        </Collapsible>
      )
    }

    if (search && !itemMatches(value, search)) return []

    return (
      <button
        type='button'
        key={value.name}
        style={{ marginLeft: depth * 12 }}
        className={`flex items-center gap-2 rounded px-3 py-1.5 text-left text-sm transition-colors ${
          selected === value.name
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
        onClick={() => onSelect(value.name)}
      >
        <Badge variant={getKindBadgeVariant(value.kind)}>
          {value.kind === 'query' ? 'Q' : 'M'}
        </Badge>
        {value.title}
      </button>
    )
  })

export default function ApiTest() {
  const docs = useMemo(() => buildDocs(), [])
  const tree = useMemo(() => buildTree(docs), [docs])
  const [search, setSearch] = useState('')
  const [selectedName, setSelectedName] = useState<ManagerOperationName>(
    docs[0]?.name ?? 'manager.contentTypes',
  )

  const filteredDocs = useMemo(
    () => docs.filter((doc) => itemMatches(doc, search)),
    [docs, search],
  )

  useEffect(() => {
    if (filteredDocs.length === 0) return
    if (!filteredDocs.some((doc) => doc.name === selectedName)) {
      setSelectedName(filteredDocs[0]!.name)
    }
  }, [filteredDocs, selectedName])

  const selectedDoc = docs.find((doc) => doc.name === selectedName)

  if (!selectedDoc) return null

  return (
    <div className='grid w-full grid-cols-[20rem_minmax(0,1fr)] rounded-xl border'>
      <ScrollArea className='relative h-[calc(100vh-10rem)] overflow-y-auto border-r p-4'>
        <div className='bg-card sticky top-0 mb-4 flex items-center gap-2 rounded-md border px-3 py-1'>
          <Search className='size-4 text-muted-foreground' />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className='border-0 shadow-none focus-visible:ring-0'
            placeholder='Search...'
          />
        </div>
        {Object.entries(tree).map(([key, value]) => {
          if (!groupHasMatch(value, search)) return null

          return (
            <Collapsible key={key} defaultOpen className='block'>
              <CollapsibleTrigger asChild>
                <button
                  type='button'
                  className='flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
                >
                  <Folder className='size-4' />
                  {operationNameToTitle(key)}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className='flex flex-col gap-2'>
                {renderTree({
                  items: value,
                  search,
                  selected: selectedName,
                  onSelect: (name) => setSelectedName(name as ManagerOperationName),
                  depth: 1,
                })}
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </ScrollArea>

      <ScrollArea className='h-[calc(100vh-10rem)] overflow-y-auto p-4'>
        <section className='space-y-6'>
          <div>
            <div className='flex items-center gap-2'>
              <Badge variant={getKindBadgeVariant(selectedDoc.kind)}>
                {selectedDoc.kind}
              </Badge>
              <Badge variant='outline'>{selectedDoc.method}</Badge>
              <Badge variant='outline'>{selectedDoc.access}</Badge>
            </div>
            <h2 className='mt-3 text-3xl font-semibold'>{selectedDoc.title}</h2>
            <p className='mt-2 text-sm text-muted-foreground'>
              {selectedDoc.description}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Route</CardTitle>
              <CardDescription>{selectedDoc.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <CodeBlock className='min-h-0 py-3'>{selectedDoc.path}</CodeBlock>
            </CardContent>
          </Card>

          <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>Input Schema</CardTitle>
                <CardDescription>
                  JSON Schema generated from the contract input.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock>{stringifySchema(selectedDoc.input)}</CodeBlock>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Output Schema</CardTitle>
                <CardDescription>
                  JSON Schema generated from the contract output.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock>{stringifySchema(selectedDoc.output)}</CodeBlock>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Playground</CardTitle>
              <CardDescription>
                Execute the operation with the current manager client.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiPlayground
                operationName={selectedDoc.name}
                defaultInput={createDefaultInput(
                  selectedDoc.name,
                  selectedDoc.input,
                )}
              />
            </CardContent>
          </Card>
        </section>
      </ScrollArea>
    </div>
  )
}
