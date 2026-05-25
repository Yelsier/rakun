'use client'

import type { ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import { useManagerMutation, useManagerQuery } from '@/client/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAvatar } from '@/components/user-avatar'

type VersionRecord = {
  _id: string
  revision: number
  operation: 'create' | 'update' | 'delete' | 'restore'
  actorId?: string
  actorLabel?: string
  actorAvatar?: {
    previewUrl?: string
    url?: string
  }
  changedAt: string | Date
  diff: VersionDiffEntry[]
}

type VersionDiffEntry = { path: string; before: unknown; after: unknown }

const formatDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

const isDiffRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const isTranslatableDiffRecord = (
  value: unknown
): value is Record<string, unknown> & { _tag: 'Translatable' } =>
  isDiffRecord(value) && value._tag === 'Translatable'

const SYSTEM_DIFF_FIELDS = new Set([
  '_id',
  '_revision',
  '_schemaVersion',
  '_type',
  'createdAt',
  'createdBy',
  'revision',
  'updatedAt',
  'updatedBy',
])

const isSystemDiffPath = (path: string) => {
  const segments = path.split('.')
  const lastSegment = segments[segments.length - 1] ?? path
  return SYSTEM_DIFF_FIELDS.has(lastSegment)
}

const normalizeVersionDiffs = (diffs: VersionDiffEntry[]) =>
  diffs
    .flatMap((entry) => {
      if (entry.path !== '$' || (!isDiffRecord(entry.before) && !isDiffRecord(entry.after))) {
        return [entry]
      }

      const before = isDiffRecord(entry.before) ? entry.before : {}
      const after = isDiffRecord(entry.after) ? entry.after : {}
      const keys = new Set([...Object.keys(before), ...Object.keys(after)])

      return Array.from(keys).map((key) => ({
        path: key,
        before: before[key],
        after: after[key],
      }))
    })
    .filter((entry) => !isSystemDiffPath(entry.path))

const formatDiffPath = (path: string) =>
  path === '$'
    ? 'Document'
    : path
        .replace(/\.(\d+)(?=\.|$)/g, '[$1]')
        .split('.')
        .join(' / ')

const stringifyDiffValue = (value: unknown): string => {
  if (value === undefined) return ''
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (isTranslatableDiffRecord(value)) {
    return Object.entries(value)
      .filter(([key]) => key !== '_tag')
      .map(([key, item]): string => `${key}: ${stringifyDiffValue(item) || 'Empty'}`)
      .join('\n')
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

type TextDiffPart = {
  value: string
  type: 'equal' | 'added' | 'removed'
}

const tokenizeText = (value: string) => value.match(/\s+|[^\s]+/g) ?? []

const getTextDiffParts = (before: string, after: string): TextDiffPart[] => {
  if (before === after) return [{ value: before, type: 'equal' }]

  const left = tokenizeText(before)
  const right = tokenizeText(after)

  if (left.length * right.length > 6000) {
    return [
      ...(before ? [{ value: before, type: 'removed' as const }] : []),
      ...(after ? [{ value: after, type: 'added' as const }] : []),
    ]
  }

  const table = Array.from({ length: left.length + 1 }, () =>
    Array(right.length + 1).fill(0)
  ) as number[][]

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i][j] =
        left[i] === right[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }

  const parts: TextDiffPart[] = []
  let i = 0
  let j = 0

  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      parts.push({ value: left[i], type: 'equal' })
      i += 1
      j += 1
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      parts.push({ value: left[i], type: 'removed' })
      i += 1
    } else {
      parts.push({ value: right[j], type: 'added' })
      j += 1
    }
  }

  while (i < left.length) {
    parts.push({ value: left[i], type: 'removed' })
    i += 1
  }

  while (j < right.length) {
    parts.push({ value: right[j], type: 'added' })
    j += 1
  }

  return parts
}

const DiffText = ({ before, after }: { before: unknown; after: unknown }) => {
  const beforeText = stringifyDiffValue(before)
  const afterText = stringifyDiffValue(after)
  const parts = getTextDiffParts(beforeText, afterText)

  if (!beforeText && !afterText) {
    return <span className="text-muted-foreground">Empty</span>
  }

  return (
    <div className="text-sm leading-7 whitespace-pre-wrap wrap-break-word">
      {parts.map((part, index) => {
        if (part.type === 'removed') {
          return (
            <span
              key={`${part.type}:${index}`}
              className="rounded-sm bg-red-500/15 px-0.5 text-red-700 line-through decoration-red-700 dark:text-red-300"
            >
              {part.value}
            </span>
          )
        }

        if (part.type === 'added') {
          return (
            <span
              key={`${part.type}:${index}`}
              className="rounded-sm bg-emerald-500/15 px-0.5 text-emerald-700 underline decoration-emerald-600 underline-offset-2 dark:text-emerald-300"
            >
              {part.value}
            </span>
          )
        }

        return <span key={`${part.type}:${index}`}>{part.value}</span>
      })}
    </div>
  )
}

type ModuleDiffItem = {
  name: string
  value?: unknown
}

type ModuleChange = {
  type: 'added' | 'removed' | 'updated'
  before?: ModuleDiffItem
  after?: ModuleDiffItem
}

const isModuleDiffItem = (value: unknown): value is ModuleDiffItem =>
  isDiffRecord(value) && typeof value.name === 'string' && 'value' in value

const isModuleList = (value: unknown): value is ModuleDiffItem[] =>
  Array.isArray(value) && value.length > 0 && value.every(isModuleDiffItem)

const stableValue = (value: unknown) => {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const getModuleChanges = (beforeValue: unknown, afterValue: unknown): ModuleChange[] => {
  const before = isModuleList(beforeValue) ? beforeValue : []
  const after = isModuleList(afterValue) ? afterValue : []
  const matchedBefore = new Set<number>()
  const matchedAfter = new Set<number>()
  const changes: ModuleChange[] = []

  after.forEach((afterItem, afterIndex) => {
    const beforeIndex = before.findIndex(
      (beforeItem, index) =>
        !matchedBefore.has(index) && stableValue(beforeItem) === stableValue(afterItem)
    )

    if (beforeIndex >= 0) {
      matchedBefore.add(beforeIndex)
      matchedAfter.add(afterIndex)
    }
  })

  after.forEach((afterItem, afterIndex) => {
    if (matchedAfter.has(afterIndex)) return

    const beforeIndex = before.findIndex(
      (beforeItem, index) =>
        !matchedBefore.has(index) && beforeItem.name === afterItem.name && index === afterIndex
    )

    if (beforeIndex >= 0) {
      matchedBefore.add(beforeIndex)
      matchedAfter.add(afterIndex)
      changes.push({
        type: 'updated',
        before: before[beforeIndex],
        after: afterItem,
      })
    }
  })

  after.forEach((afterItem, index) => {
    if (!matchedAfter.has(index)) {
      changes.push({ type: 'added', after: afterItem })
    }
  })

  before.forEach((beforeItem, index) => {
    if (!matchedBefore.has(index)) {
      changes.push({ type: 'removed', before: beforeItem })
    }
  })

  return changes
}

const humanizeFieldName = (value: string) =>
  value
    .replace(/^_+/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_.]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const extractLexicalText = (value: unknown): string | null => {
  if (!isDiffRecord(value) && !Array.isArray(value)) return null

  const parts: string[] = []
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }

    if (!isDiffRecord(node)) return

    if (typeof node.text === 'string') {
      parts.push(node.text)
    }

    if (Array.isArray(node.children)) {
      node.children.forEach(visit)
    }
  }

  if (isDiffRecord(value) && isDiffRecord(value.root)) {
    visit(value.root)
  }

  return parts.length > 0 ? parts.join(' ') : null
}

const summarizeValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return 'Empty'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  const richText = extractLexicalText(value)
  if (richText) return richText

  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? '' : 's'}`
  }

  if (!isDiffRecord(value)) {
    return String(value)
  }

  if (isTranslatableDiffRecord(value)) {
    return Object.entries(value)
      .filter(([key]) => key !== '_tag')
      .map(([key, item]) => `${key}: ${summarizeValue(item)}`)
      .join(', ')
  }

  if (value.type === 'existing') {
    return `Existing ${String(value.contentType ?? 'item')}`
  }

  if (value.type === 'new' && isDiffRecord(value.data)) {
    return `New ${String(value.data._type ?? 'item')}`
  }

  return Object.entries(value)
    .filter(([key]) => !isSystemDiffPath(key))
    .slice(0, 3)
    .map(([key, item]) => `${humanizeFieldName(key)}: ${summarizeValue(item)}`)
    .join(', ')
}

const getReadableDiffText = (value: unknown) => {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return summarizeValue(value)
}

const getTranslatableLanguages = (...values: unknown[]) =>
  Array.from(
    new Set(
      values.flatMap((value) =>
        isTranslatableDiffRecord(value)
          ? Object.keys(value).filter((key) => key !== '_tag')
          : []
      )
    )
  )

const TranslatableDiff = ({ before, after }: { before: unknown; after: unknown }) => {
  const beforeRecord: Record<string, unknown> = isTranslatableDiffRecord(before) ? before : {}
  const afterRecord: Record<string, unknown> = isTranslatableDiffRecord(after) ? after : {}
  const languages = getTranslatableLanguages(before, after).filter(
    (language) => stableValue(beforeRecord[language]) !== stableValue(afterRecord[language])
  )

  if (languages.length === 0) {
    return <DiffText before={getReadableDiffText(before)} after={getReadableDiffText(after)} />
  }

  return (
    <div className="flex flex-col gap-2">
      {languages.map((language) => (
        <div key={language} className="rounded border bg-background/60 px-2 py-1.5">
          <div className="text-muted-foreground mb-1 text-[11px] font-medium uppercase">
            {language}
          </div>
          <DiffText
            before={getReadableDiffText(beforeRecord[language])}
            after={getReadableDiffText(afterRecord[language])}
          />
        </div>
      ))}
    </div>
  )
}

const getModuleData = (module: ModuleDiffItem | undefined) => {
  const value = module?.value

  if (!isDiffRecord(value)) return {}

  if (value.type === 'new' && isDiffRecord(value.data)) {
    return value.data
  }

  if (value.type === 'existing') {
    return {
      contentType: value.contentType,
      id: value._id,
    }
  }

  return value
}

const getModuleDetails = (module: ModuleDiffItem | undefined) =>
  Object.entries(getModuleData(module))
    .filter(([key]) => !isSystemDiffPath(key))
    .slice(0, 6)

const ActionShell = ({
  type,
  title,
  children,
}: {
  type: ModuleChange['type']
  title: string
  children?: ReactNode
}) => {
  const styles = {
    added: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-900 dark:text-emerald-100',
    removed: 'border-red-500/25 bg-red-500/5 text-red-900 dark:text-red-100',
    updated: 'border-amber-500/25 bg-amber-500/5 text-amber-900 dark:text-amber-100',
  }

  const labels = {
    added: 'Added',
    removed: 'Removed',
    updated: 'Updated',
  }

  return (
    <div className={`rounded-md border p-3 ${styles[type]}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="bg-background/70">
          {labels[type]}
        </Badge>
        <span className="text-sm font-medium">{title}</span>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  )
}

const ModuleDetails = ({ module }: { module: ModuleDiffItem | undefined }) => {
  const details = getModuleDetails(module)

  if (details.length === 0) return null

  return (
    <dl className="grid gap-2 text-sm md:grid-cols-2">
      {details.map(([key, value]) => (
        <div key={key} className="min-w-0 rounded bg-background/60 px-2 py-1.5">
          <dt className="text-muted-foreground text-xs">{humanizeFieldName(key)}</dt>
          <dd className="mt-0.5 wrap-break-word">{summarizeValue(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

const ModuleUpdateDetails = ({ change }: { change: ModuleChange }) => {
  const before = getModuleData(change.before)
  const after = getModuleData(change.after)
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter(
    (key) => !isSystemDiffPath(key) && stableValue(before[key]) !== stableValue(after[key])
  )

  if (keys.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {keys.slice(0, 6).map((key) => (
        <div key={key} className="rounded bg-background/60 px-2 py-1.5">
          <div className="text-muted-foreground mb-1 text-xs">{humanizeFieldName(key)}</div>
          {isTranslatableDiffRecord(before[key]) || isTranslatableDiffRecord(after[key]) ? (
            <TranslatableDiff before={before[key]} after={after[key]} />
          ) : (
            <DiffText
              before={getReadableDiffText(before[key])}
              after={getReadableDiffText(after[key])}
            />
          )}
        </div>
      ))}
    </div>
  )
}

const ModuleListDiff = ({ entry }: { entry: VersionDiffEntry }) => {
  if (!isModuleList(entry.before) && !isModuleList(entry.after)) {
    return null
  }

  const changes = getModuleChanges(entry.before, entry.after)
  const fieldName = formatDiffPath(entry.path)

  return (
    <div className="rounded-md border bg-background">
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <span className="min-w-0 truncate font-mono text-xs font-medium">{fieldName}</span>
      </div>
      <div className="flex flex-col gap-3 px-3 py-3">
        {changes.length === 0 ? (
          <div className="text-muted-foreground text-sm">No visible module changes.</div>
        ) : null}
        {changes.map((change, index) => {
          const module = change.after ?? change.before
          const moduleName = module?.name ?? 'Module'

          return (
            <ActionShell
              key={`${change.type}:${moduleName}:${index}`}
              type={change.type}
              title={`${moduleName} module`}
            >
              {change.type === 'updated' ? (
                <ModuleUpdateDetails change={change} />
              ) : (
                <ModuleDetails module={module} />
              )}
            </ActionShell>
          )
        })}
      </div>
    </div>
  )
}

const DiffBlock = ({ entry }: { entry: VersionDiffEntry }) => {
  const beforeText = stringifyDiffValue(entry.before)
  const afterText = stringifyDiffValue(entry.after)
  const isSimpleText = typeof entry.before === 'string' || typeof entry.after === 'string'

  if (isModuleList(entry.before) || isModuleList(entry.after)) {
    return <ModuleListDiff entry={entry} />
  }

  return (
    <div className="rounded-md border bg-background">
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <span className="min-w-0 truncate font-mono text-xs font-medium">
          {formatDiffPath(entry.path)}
        </span>
      </div>
      <div className="px-3 py-3">
        {isSimpleText ? (
          <DiffText before={entry.before} after={entry.after} />
        ) : isTranslatableDiffRecord(entry.before) || isTranslatableDiffRecord(entry.after) ? (
          <TranslatableDiff before={entry.before} after={entry.after} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0 rounded-md border border-red-500/20 bg-red-500/5 p-3">
              <div className="mb-2 text-xs font-medium text-red-700 dark:text-red-300">Removed</div>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap wrap-break-word text-xs text-red-900 line-through dark:text-red-200">
                {beforeText || 'Empty'}
              </pre>
            </div>
            <div className="min-w-0 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="mb-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Added
              </div>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap wrap-break-word text-xs text-emerald-900 dark:text-emerald-200">
                {afterText || 'Empty'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const VersionHistory = ({
  contentType,
  documentId,
  canRestore,
  onRestored,
}: {
  contentType: string
  documentId: string
  canRestore: boolean
  onRestored?: () => Promise<unknown> | unknown
}) => {
  const versionsQuery = useManagerQuery({
    name: 'manager.versions.list',
    input: { contentType, documentId },
  })
  const restoreMutation = useManagerMutation('manager.versions.restore')

  const restoreVersion = async (versionId: string) => {
    await restoreMutation.mutateAsync({
      versionId,
      reason: 'manager restore',
    })
    toast.success('Version restored successfully')
    await versionsQuery.refetch()
    await onRestored?.()
  }

  const versions = (versionsQuery.data ?? []) as VersionRecord[]

  if (versionsQuery.isLoading) {
    return <div className="text-muted-foreground text-sm">Loading...</div>
  }

  if (versions.length === 0) {
    return <div className="text-muted-foreground text-sm">No versions recorded yet.</div>
  }

  return (
    <div className="flex flex-col gap-3">
      {versions.map((version) => {
        const visibleDiffs = normalizeVersionDiffs(version.diff)

        return (
          <Card key={version._id} className="rounded-lg py-4">
            <CardHeader className="flex-row items-center justify-between gap-4 px-4">
              <div className="flex min-w-0 flex-col gap-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  Revision {version.revision}
                  <Badge variant="outline">{version.operation}</Badge>
                  <Badge variant="secondary">
                    {visibleDiffs.length} field
                    {visibleDiffs.length === 1 ? '' : 's'}
                  </Badge>
                </CardTitle>
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span>{formatDateTime(version.changedAt)}</span>
                  {version.actorLabel || version.actorId ? (
                    <>
                      <span>by</span>
                      <UserAvatar
                        name={version.actorLabel}
                        avatar={version.actorAvatar}
                        className="size-5"
                        fallbackClassName="text-[10px]"
                      />
                      <span>{version.actorLabel ?? version.actorId}</span>
                    </>
                  ) : null}
                </div>
              </div>
              {canRestore ? (
                <Button
                  variant="outline"
                  size="sm"
                  loading={restoreMutation.isPending}
                  onClick={() => void restoreVersion(version._id)}
                >
                  <RotateCcw />
                  Restore
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="px-4">
              {visibleDiffs.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {visibleDiffs.map((entry) => (
                    <DiffBlock key={`${version._id}:${entry.path}`} entry={entry} />
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground rounded-md border bg-muted/20 px-3 py-2 text-sm">
                  No content fields changed.
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default VersionHistory
