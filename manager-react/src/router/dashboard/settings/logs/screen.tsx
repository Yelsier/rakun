'use client'

import type { ManagerOperationOutput } from '@rakun-kit/core/manager'
import { Eye, Filter, RotateCcw, Trash2, XIcon } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { useManagerMutation, useManagerQuery } from '@/client/react'
import Loading from '@/components/loading'
import UnauthorizedMessage from '@/components/unauthorized'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTranslations } from '@/i18n'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { useSession } from '@/state/session'

type EventLogPage = ManagerOperationOutput<'manager.logs.list'>
type EventLogRecord = EventLogPage['items'][number]

type LogFilters = {
  type: string
  category: string
  outcome: 'all' | EventLogRecord['outcome']
  severity: 'all' | EventLogRecord['severity']
  source: string
  correlationId: string
  tags: string
  from: string
  to: string
}

const emptyFilters: LogFilters = {
  type: '',
  category: '',
  outcome: 'all',
  severity: 'all',
  source: '',
  correlationId: '',
  tags: '',
  from: '',
  to: '',
}

const splitValues = (value: string) => {
  const values = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return values.length > 0 ? values : undefined
}

const toIsoDate = (value: string) => (value ? new Date(value).toISOString() : undefined)

const toDateTimeLocalValue = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)

const getDefaultCleanupDate = () => {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return toDateTimeLocalValue(date)
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value))

const outcomeVariant = (outcome: EventLogRecord['outcome']) =>
  outcome === 'failure' ? 'destructive' : outcome === 'success' ? 'secondary' : 'outline'

export const ManagerSettingsLogsScreen = () => {
  const t = useTranslations()
  const { hasPermissions } = useSession()
  const canReadLogs = hasPermissions(['system.eventLog.read'])
  const canManageLogs = hasPermissions(['system.eventLog.manage'])
  const [draftFilters, setDraftFilters] = useState<LogFilters>(emptyFilters)
  const [filters, setFilters] = useState<LogFilters>(emptyFilters)
  const [cursor, setCursor] = useState<string>()
  const [previousCursors, setPreviousCursors] = useState<Array<string | undefined>>([])
  const [selectedEvent, setSelectedEvent] = useState<EventLogRecord | null>(null)
  const [cleanupOpen, setCleanupOpen] = useState(false)
  const [cleanupBefore, setCleanupBefore] = useState('')

  const input = useMemo(
    () => ({
      types: splitValues(filters.type),
      categories: splitValues(filters.category),
      outcomes: filters.outcome === 'all' ? undefined : [filters.outcome],
      severities: filters.severity === 'all' ? undefined : [filters.severity],
      sources: splitValues(filters.source),
      correlationId: filters.correlationId.trim() || undefined,
      tags: splitValues(filters.tags),
      from: toIsoDate(filters.from),
      to: toIsoDate(filters.to),
      cursor,
      limit: 50,
    }),
    [cursor, filters]
  )

  const logsQuery = useManagerQuery({
    name: 'manager.logs.list',
    input,
    enabled: canReadLogs,
  })
  const cleanupLogs = useManagerMutation('manager.logs.cleanup')

  if (!canReadLogs) {
    return <UnauthorizedMessage neededPermission={['system.eventLog.read']} />
  }

  const applyFilters = (event: FormEvent) => {
    event.preventDefault()
    setFilters(draftFilters)
    setCursor(undefined)
    setPreviousCursors([])
  }

  const resetFilters = () => {
    setDraftFilters(emptyFilters)
    setFilters(emptyFilters)
    setCursor(undefined)
    setPreviousCursors([])
  }

  const goToNextPage = () => {
    if (!logsQuery.data?.nextCursor) return
    setPreviousCursors((current) => [...current, cursor])
    setCursor(logsQuery.data.nextCursor)
  }

  const goToPreviousPage = () => {
    const previous = previousCursors[previousCursors.length - 1]
    setPreviousCursors((current) => current.slice(0, -1))
    setCursor(previous)
  }

  const openCleanupDialog = () => {
    setCleanupBefore(getDefaultCleanupDate())
    setCleanupOpen(true)
  }

  const confirmCleanup = async () => {
    const before = toIsoDate(cleanupBefore)
    if (!before) return

    try {
      const result = await cleanupLogs.mutateAsync({ before })
      setCleanupOpen(false)
      setCursor(undefined)
      setPreviousCursors([])
      if (!cursor) await logsQuery.refetch()
      toast.success(t('settings.logs.cleanupSuccess', { count: result.deletedCount }))
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('settings.logs.cleanupError')))
    }
  }

  return (
    <div className="container mx-auto flex flex-col gap-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('settings.logs')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('settings.logs.description')}</p>
        </div>
        {canManageLogs ? (
          <Button type="button" variant="destructive" onClick={openCleanupDialog}>
            <Trash2 />
            {t('settings.logs.cleanup')}
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={applyFilters}>
            <label className="grid gap-1 text-sm">
              <span>{t('settings.logs.type')}</span>
              <Input
                value={draftFilters.type}
                placeholder={t('settings.logs.commaSeparated')}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t('settings.logs.category')}</span>
              <Input
                value={draftFilters.category}
                placeholder={t('settings.logs.commaSeparated')}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t('settings.logs.outcome')}</span>
              <Select
                value={draftFilters.outcome}
                onValueChange={(outcome: LogFilters['outcome']) =>
                  setDraftFilters((current) => ({ ...current, outcome }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('settings.logs.all')}</SelectItem>
                  <SelectItem value="pending">{t('settings.logs.outcome.pending')}</SelectItem>
                  <SelectItem value="success">{t('settings.logs.outcome.success')}</SelectItem>
                  <SelectItem value="failure">{t('settings.logs.outcome.failure')}</SelectItem>
                  <SelectItem value="neutral">{t('settings.logs.outcome.neutral')}</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t('settings.logs.severity')}</span>
              <Select
                value={draftFilters.severity}
                onValueChange={(severity: LogFilters['severity']) =>
                  setDraftFilters((current) => ({ ...current, severity }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('settings.logs.all')}</SelectItem>
                  <SelectItem value="debug">{t('settings.logs.severity.debug')}</SelectItem>
                  <SelectItem value="info">{t('settings.logs.severity.info')}</SelectItem>
                  <SelectItem value="warning">{t('settings.logs.severity.warning')}</SelectItem>
                  <SelectItem value="error">{t('settings.logs.severity.error')}</SelectItem>
                  <SelectItem value="critical">{t('settings.logs.severity.critical')}</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t('settings.logs.source')}</span>
              <Input
                value={draftFilters.source}
                placeholder={t('settings.logs.commaSeparated')}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    source: event.target.value,
                  }))
                }
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t('settings.logs.correlationId')}</span>
              <Input
                value={draftFilters.correlationId}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    correlationId: event.target.value,
                  }))
                }
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>{t('settings.logs.tags')}</span>
              <Input
                value={draftFilters.tags}
                placeholder={t('settings.logs.commaSeparated')}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    tags: event.target.value,
                  }))
                }
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm">
                <span>{t('settings.logs.from')}</span>
                <Input
                  type="datetime-local"
                  value={draftFilters.from}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      from: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>{t('settings.logs.to')}</span>
                <Input
                  type="datetime-local"
                  value={draftFilters.to}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      to: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="flex gap-2 md:col-span-2 xl:col-span-4">
              <Button type="submit">
                <Filter />
                {t('settings.logs.applyFilters')}
              </Button>
              <Button type="button" variant="outline" onClick={resetFilters}>
                <RotateCcw />
                {t('common.reset')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto">
          {logsQuery.isLoading ? (
            <Loading />
          ) : logsQuery.isError ? (
            <div className="text-destructive py-8 text-center text-sm">
              {t('settings.logs.loadError')}
            </div>
          ) : logsQuery.data?.items.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings.logs.date')}</TableHead>
                  <TableHead>{t('settings.logs.event')}</TableHead>
                  <TableHead>{t('settings.logs.category')}</TableHead>
                  <TableHead>{t('settings.logs.outcome')}</TableHead>
                  <TableHead>{t('settings.logs.severity')}</TableHead>
                  <TableHead>{t('settings.logs.source')}</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">{t('settings.logs.details')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.data.items.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{formatDateTime(event.occurredAt)}</TableCell>
                    <TableCell className="font-mono text-xs">{event.type}</TableCell>
                    <TableCell>{event.category}</TableCell>
                    <TableCell>
                      <Badge variant={outcomeVariant(event.outcome)}>{event.outcome}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          event.severity === 'error' || event.severity === 'critical'
                            ? 'destructive'
                            : 'outline'
                        }
                      >
                        {event.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{event.source ?? '—'}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <Eye />
                        <span className="sr-only">{t('settings.logs.details')}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-muted-foreground py-12 text-center text-sm">
              {t('settings.logs.empty')}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground text-sm">
          {t('settings.logs.page', { page: previousCursors.length + 1 })}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={previousCursors.length === 0}
            onClick={goToPreviousPage}
          >
            {t('settings.logs.previous')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!logsQuery.data?.nextCursor}
            onClick={goToNextPage}
          >
            {t('settings.logs.next')}
          </Button>
        </div>
      </div>

      <Drawer
        direction="right"
        open={selectedEvent !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null)
        }}
      >
        <DrawerContent className="h-full overflow-y-auto data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-none md:data-[vaul-drawer-direction=right]:w-[min(92vw,36rem)] md:data-[vaul-drawer-direction=right]:max-w-[36rem]">
          <DrawerHeader className="shrink-0 border-b text-start">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <DrawerTitle>{selectedEvent?.type}</DrawerTitle>
                <DrawerDescription>
                  {selectedEvent ? formatDateTime(selectedEvent.occurredAt) : ''}
                </DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label={t('common.close')}
                >
                  <XIcon className="size-4" />
                  <span className="sr-only">{t('common.close')}</span>
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          {selectedEvent ? (
            <div className="grid gap-5 px-4 pb-6 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-muted-foreground">{t('settings.logs.id')}</div>
                  <div className="break-all">{selectedEvent.id}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t('settings.logs.category')}</div>
                  <div>{selectedEvent.category}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t('settings.logs.outcome')}</div>
                  <div>{selectedEvent.outcome}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t('settings.logs.severity')}</div>
                  <div>{selectedEvent.severity}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t('settings.logs.source')}</div>
                  <div>{selectedEvent.source ?? '—'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t('settings.logs.correlationId')}</div>
                  <div className="break-all">{selectedEvent.correlationId ?? '—'}</div>
                </div>
              </div>
              {selectedEvent.message ? (
                <div>
                  <div className="text-muted-foreground">{t('settings.logs.message')}</div>
                  <div className="mt-1 whitespace-pre-wrap">{selectedEvent.message}</div>
                </div>
              ) : null}
              {selectedEvent.actor ? (
                <div>
                  <div className="text-muted-foreground">{t('settings.logs.actor')}</div>
                  <pre className="bg-muted mt-1 overflow-x-auto rounded-md p-3 text-xs">
                    {JSON.stringify(selectedEvent.actor, null, 2)}
                  </pre>
                </div>
              ) : null}
              {selectedEvent.resource ? (
                <div>
                  <div className="text-muted-foreground">{t('settings.logs.resource')}</div>
                  <pre className="bg-muted mt-1 overflow-x-auto rounded-md p-3 text-xs">
                    {JSON.stringify(selectedEvent.resource, null, 2)}
                  </pre>
                </div>
              ) : null}
              <div>
                <div className="text-muted-foreground">{t('settings.logs.data')}</div>
                <pre className="bg-muted mt-1 overflow-x-auto rounded-md p-3 text-xs">
                  {JSON.stringify(selectedEvent.data ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <div className="text-muted-foreground">{t('settings.logs.tags')}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedEvent.tags.length > 0
                    ? selectedEvent.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))
                    : '—'}
                </div>
              </div>
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>

      <Dialog
        open={cleanupOpen}
        onOpenChange={(open) => {
          if (!cleanupLogs.isPending) setCleanupOpen(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.logs.cleanupTitle')}</DialogTitle>
            <DialogDescription>{t('settings.logs.cleanupDescription')}</DialogDescription>
          </DialogHeader>
          <label className="grid gap-1 text-sm">
            <span>{t('settings.logs.cleanupBefore')}</span>
            <Input
              type="datetime-local"
              value={cleanupBefore}
              max={toDateTimeLocalValue(new Date())}
              onChange={(event) => setCleanupBefore(event.target.value)}
            />
          </label>
          {cleanupBefore ? (
            <p className="text-muted-foreground text-sm">
              {t('settings.logs.cleanupConfirmation', {
                date: formatDateTime(toIsoDate(cleanupBefore)!),
              })}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={cleanupLogs.isPending}
              onClick={() => setCleanupOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={cleanupLogs.isPending}
              disabled={!cleanupBefore}
              onClick={() => void confirmCleanup()}
            >
              {t('settings.logs.cleanupConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
