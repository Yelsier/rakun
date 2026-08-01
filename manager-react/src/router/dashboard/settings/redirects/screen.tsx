'use client'

import type { Permission } from '@rakun-kit/core/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { HelpCircle, Plus, Waypoints } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'

import { columns, type RedirectManager } from './columns'

import { useManagerMutation, useManagerQuery } from '@/client/react'
import { confirm } from '@/components/confirm'
import Loading from '@/components/loading'
import { PaginationController } from '@/components/PaginationController'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import UnauthorizedMessage from '@/components/unauthorized'
import { useTranslations } from '@/i18n'
import { useSession } from '@/state/session'

const pathTokenRegex = /\{([a-zA-Z0-9_]+)\}/g

const formSchema = z
  .object({
    _type: z.literal('Redirect'),
    name: z.string().min(1),
    enabled: z.boolean(),
    sourcePath: z.string().min(1),
    destinationPath: z.string().min(1),
    statusMode: z.enum(['301', '302', '307', '308', 'custom']),
    customStatus: z.number().min(300).max(399).optional(),
    preserveQuery: z.boolean(),
    headerName: z.string().optional(),
    headerMatchMode: z.enum(['none', 'exists', 'equals', 'contains', 'startsWith', 'regex']),
    headerValue: z.string().optional(),
    functionName: z.enum(['none', 'acceptLanguageToParam', 'headerValueToParam']),
    functionConfig: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.statusMode === 'custom' && !data.customStatus) {
      ctx.addIssue({
        code: 'custom',
        path: ['customStatus'],
        message: 'Custom status is required when status mode is "custom".',
      })
    }

    if (data.headerMatchMode !== 'none' && !data.headerName?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['headerName'],
        message: 'Header name is required when a header match mode is enabled.',
      })
    }

    if (
      data.headerMatchMode !== 'none' &&
      data.headerMatchMode !== 'exists' &&
      !data.headerValue?.trim()
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['headerValue'],
        message: 'Header value is required for this match mode.',
      })
    }

    if (data.functionName !== 'none' && data.functionConfig?.trim()) {
      try {
        JSON.parse(data.functionConfig)
      } catch {
        ctx.addIssue({
          code: 'custom',
          path: ['functionConfig'],
          message: 'Function config must be valid JSON.',
        })
      }
    }
  })

type RedirectFormValues = z.infer<typeof formSchema>

const HelpTooltip = ({ children }: { children: ReactNode }) => {
  const t = useTranslations()
  return (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground inline-flex h-4 w-4 items-center justify-center rounded-full"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        <span className="sr-only">{t('settings.redirects.showHelp')}</span>
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs leading-relaxed" sideOffset={6}>
      {children}
    </TooltipContent>
  </Tooltip>
  )
}

const LabelWithHelp = ({ children, help }: { children: ReactNode; help: ReactNode }) => (
  <div className="flex items-center gap-1.5">
    <FormLabel>{children}</FormLabel>
    <HelpTooltip>{help}</HelpTooltip>
  </div>
)

const getPathPreview = (sourcePath: string, destinationPath: string, samplePath: string) => {
  const cleanSample = samplePath.trim()
  if (!cleanSample) return null

  const source = sourcePath.endsWith('/') ? sourcePath : `${sourcePath}/`
  const sample = cleanSample.endsWith('/') ? cleanSample : `${cleanSample}/`

  let regexBody = ''
  let lastIndex = 0
  const names: string[] = []
  let match: RegExpExecArray | null
  while ((match = pathTokenRegex.exec(source)) !== null) {
    const [full, name] = match
    regexBody += source.slice(lastIndex, match.index).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    regexBody += '([^/]+)'
    if (name) names.push(name)
    lastIndex = match.index + full.length
  }
  regexBody += source.slice(lastIndex).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const result = new RegExp(`^${regexBody}$`).exec(sample)
  if (!result) return null

  const params = Object.fromEntries(names.map((name, idx) => [name, result[idx + 1] ?? '']))

  return destinationPath.replace(pathTokenRegex, (_all, name: string) => params[name] ?? '')
}

const defaultValues: RedirectFormValues = {
  _type: 'Redirect',
  name: '',
  enabled: true,
  sourcePath: '/old/{slug}',
  destinationPath: '/new/{slug}',
  statusMode: '301',
  customStatus: undefined,
  preserveQuery: true,
  headerName: '',
  headerMatchMode: 'none',
  headerValue: '',
  functionName: 'none',
  functionConfig: '',
}

export const ManagerSettingsRedirectsScreen = () => {
  const t = useTranslations()
  const { user, hasPermissions } = useSession()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [editing, setEditing] = useState<RedirectManager | null>(null)
  const [samplePath, setSamplePath] = useState('/old/hello-world')

  const listQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: 'Redirect',
      query: { options: { limit: itemsPerPage, page } },
    },
  })
  const createMutation = useManagerMutation('manager.create')
  const updateMutation = useManagerMutation('manager.update')
  const deleteMutation = useManagerMutation('manager.delete')

  const form = useForm<RedirectFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  const canCreate = hasPermissions(['content.Redirect.own' as Permission])
  const canUpdateAny = hasPermissions(['content.Redirect.updateAny' as Permission])
  const canDeleteAny = hasPermissions(['content.Redirect.deleteAny' as Permission])

  const statusMode = form.watch('statusMode')
  const headerMatchMode = form.watch('headerMatchMode')
  const functionName = form.watch('functionName')
  const sourcePath = form.watch('sourcePath')
  const destinationPath = form.watch('destinationPath')

  const preview = useMemo(
    () => getPathPreview(sourcePath, destinationPath, samplePath),
    [sourcePath, destinationPath, samplePath]
  )

  useEffect(() => {
    if (!open) {
      setEditing(null)
      form.reset(defaultValues)
    }
  }, [open, form])

  const canEditItem = (item: RedirectManager) =>
    Boolean(canUpdateAny || (item.createdBy && item.createdBy === user._id))

  const canDeleteItem = (item: RedirectManager) =>
    Boolean(canDeleteAny || (item.createdBy && item.createdBy === user._id))

  const openForCreate = () => {
    form.reset(defaultValues)
    setEditing(null)
    setOpen(true)
  }

  const openForEdit = (item: RedirectManager) => {
    setEditing(item)
    form.reset({
      _type: 'Redirect',
      name: item.name,
      enabled: item.enabled,
      sourcePath: item.sourcePath,
      destinationPath: item.destinationPath,
      statusMode: item.statusMode,
      customStatus: item.customStatus,
      preserveQuery: item.preserveQuery,
      headerName: item.headerName || '',
      headerMatchMode: item.headerMatchMode,
      headerValue: item.headerValue || '',
      functionName: item.functionName,
      functionConfig: item.functionConfig || '',
    })
    setOpen(true)
  }

  const onSubmit = async (values: RedirectFormValues) => {
    const trimmedValues = {
      ...values,
      headerName: values.headerName?.trim() || undefined,
      headerValue: values.headerValue?.trim() || undefined,
      functionConfig: values.functionConfig?.trim() || undefined,
      customStatus: values.statusMode === 'custom' ? values.customStatus : undefined,
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          contentType: 'Redirect',
          id: editing._id,
          data: trimmedValues,
        })
        toast.success(t('settings.redirects.updated'))
      } else {
        await createMutation.mutateAsync({
          contentType: 'Redirect',
          data: trimmedValues,
        })
        toast.success(t('settings.redirects.created'))
      }

      await listQuery.refetch()
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.redirects.saveError'))
    }
  }

  const handleDelete = async (redirect: RedirectManager) => {
    await confirm({
      title: t('settings.redirects.deleteTitle'),
      description: t('common.deleteNamedConfirm', { name: redirect.name }),
      confirmLabel: t('common.delete'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync({
            contentType: 'Redirect',
            id: redirect._id,
          })
          toast.success(t('settings.redirects.deleted'))
          await listQuery.refetch()
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : t('settings.redirects.deleteError'),
          )
          throw error
        }
      },
    })
  }

  if (!hasPermissions(['content.Redirect.readAny' as Permission])) {
    return <UnauthorizedMessage neededPermission={['content.Redirect.readAny' as Permission]} />
  }

  if (!listQuery.data) return <Loading />

  const items = listQuery.data.items as RedirectManager[]

  return (
    <div className="container mx-auto flex flex-col gap-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Waypoints className="h-5 w-5" />
            {t('settings.redirects.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.redirects.description')}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex justify-end">
        {canCreate ? (
          <Button data-tour="redirects-create" onClick={openForCreate}>
            <Plus className="mr-1 h-4 w-4" /> {t('settings.redirects.new')}
          </Button>
        ) : null}
      </div>

      <div data-tour="redirects-table">
        <DataTable
          columns={columns({
            onEdit: openForEdit,
            onDelete: (redirect) => {
              void handleDelete(redirect)
            },
            canEditItem,
            canDeleteItem,
            t,
          })}
          data={items}
        />
      </div>
      <PaginationController
        page={page}
        setPage={setPage}
        totalItems={listQuery.data.totalItems}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-screen max-w-7xl! overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit redirect' : 'Create redirect'}</DialogTitle>
            <DialogDescription>
              {t('settings.redirects.formDescription')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fields.name')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('settings.redirects.namePlaceholder')} />
                      </FormControl>
                      <FormDescription>
                        {t('settings.redirects.nameHelp')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.enabled')}</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                          <Label>{field.value ? 'Active' : 'Inactive'}</Label>
                        </div>
                      </FormControl>
                      <FormDescription>
                        {t('settings.redirects.enabledHelp')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sourcePath"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithHelp help="Incoming path to match. Tokens in braces capture one URL segment, for example /blog/{slug} matches /blog/hello and stores slug=hello.">
                        {t('settings.redirects.sourcePath')}
                      </LabelWithHelp>
                      <FormControl>
                        <Input {...field} placeholder="/blog/{slug}" />
                      </FormControl>
                      <FormDescription>
                        {t('settings.redirects.sourcePathHelp')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destinationPath"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithHelp help="Where the redirect sends users. Reuse source tokens like {slug}, or tokens added by mini functions like {locale}.">
                        {t('settings.redirects.destinationPath')}
                      </LabelWithHelp>
                      <FormControl>
                        <Input {...field} placeholder="/newblog/{slug}" />
                      </FormControl>
                      <FormDescription>
                        {t('settings.redirects.destinationPathHelp')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Card>
                <CardContent>
                  <div className="grid items-end gap-3 md:grid-cols-[1fr_2fr]">
                    <div className="grid gap-2">
                      <div className="flex items-center gap-1.5">
                        <Label>{t('settings.redirects.previewSample')}</Label>
                        <HelpTooltip>
                          {t('settings.redirects.previewHelp')}
                        </HelpTooltip>
                      </div>
                      <Input
                        value={samplePath}
                        onChange={(event) => setSamplePath(event.target.value)}
                        placeholder="/blog/my-post"
                      />
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{t('settings.redirects.result')} </span>
                      <span className="text-muted-foreground">
                        {preview || 'Sample path does not match source pattern.'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="statusMode"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithHelp help="301/308 are permanent. 302/307 are temporary. 307/308 preserve the HTTP method, useful for non-GET requests.">
                        {t('settings.redirects.statusCode')}
                      </LabelWithHelp>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('settings.redirects.selectStatus')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="301">{t('settings.redirects.status301')}</SelectItem>
                            <SelectItem value="302">{t('settings.redirects.status302')}</SelectItem>
                            <SelectItem value="307">{t('settings.redirects.status307')}</SelectItem>
                            <SelectItem value="308">{t('settings.redirects.status308')}</SelectItem>
                            <SelectItem value="custom">{t('common.custom')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>
                        {t('settings.redirects.statusHelp')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {statusMode === 'custom' ? (
                  <FormField
                    control={form.control}
                    name="customStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.redirects.customStatus')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={300}
                            max={399}
                            value={field.value ?? ''}
                            onChange={(event) =>
                              field.onChange(
                                event.target.value ? Number(event.target.value) : undefined
                              )
                            }
                            placeholder="302"
                          />
                        </FormControl>
                        <FormDescription>
                          {t('settings.redirects.customStatusHelp')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </div>

              <FormField
                control={form.control}
                name="preserveQuery"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.redirects.preserveQuery')}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                        <Label>
                          {field.value ? 'Keep original query params' : 'Drop query params'}
                        </Label>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {t('settings.redirects.preserveQueryHelp')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5 text-base">
                    {t('settings.redirects.headerConditions')}
                    <HelpTooltip>
                      {t('settings.redirects.headerConditionsTooltip')}
                    </HelpTooltip>
                  </CardTitle>
                  <CardDescription>
                    {t('settings.redirects.headerConditionsHelp')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="headerMatchMode"
                    render={({ field }) => (
                      <FormItem>
                        <LabelWithHelp help="{t('settings.redirects.noCondition')} always matches. Exists only checks presence. Equals, contains, starts with, and regex compare the selected header value.">
                          {t('settings.redirects.matchMode')}
                        </LabelWithHelp>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t('settings.redirects.noCondition')}</SelectItem>
                              <SelectItem value="exists">{t('settings.redirects.headerExists')}</SelectItem>
                              <SelectItem value="equals">{t('settings.redirects.equals')}</SelectItem>
                              <SelectItem value="contains">{t('settings.redirects.contains')}</SelectItem>
                              <SelectItem value="startsWith">{t('settings.redirects.startsWith')}</SelectItem>
                              <SelectItem value="regex">{t('settings.redirects.regex')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {headerMatchMode !== 'none' ? (
                    <FormField
                      control={form.control}
                      name="headerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('settings.redirects.headerName')}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ''}
                              placeholder="accept-language"
                            />
                          </FormControl>
                          <FormDescription>
                            {t('settings.redirects.headerNameHelp')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}

                  {headerMatchMode !== 'none' && headerMatchMode !== 'exists' ? (
                    <FormField
                      control={form.control}
                      name="headerValue"
                      render={({ field }) => (
                        <FormItem>
                          <LabelWithHelp help="Expected value for the selected match mode. Regex mode allows simple safe patterns; grouping and alternation are rejected.">
                            {t('settings.redirects.headerValue')}
                          </LabelWithHelp>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} placeholder="es" />
                          </FormControl>
                          <FormDescription>
                            {t('settings.redirects.headerValueHelp')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5 text-base">
                    {t('settings.redirects.miniFunction')}
                    <HelpTooltip>
                      {t('settings.redirects.miniFunctionTooltip')}
                    </HelpTooltip>
                  </CardTitle>
                  <CardDescription>
                    {t('settings.redirects.miniFunctionHelp')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="functionName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common.function')}</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t('common.none')}</SelectItem>
                              <SelectItem value="acceptLanguageToParam">
                                {t('settings.redirects.acceptLanguageToParam')}
                              </SelectItem>
                              <SelectItem value="headerValueToParam">
                                {t('settings.redirects.headerValueToParam')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          {t('settings.redirects.functionHints')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {functionName !== 'none' ? (
                    <FormField
                      control={form.control}
                      name="functionConfig"
                      render={({ field }) => (
                        <FormItem>
                          <LabelWithHelp help="Valid JSON only. acceptLanguageToParam supports param, supported, fallback. headerValueToParam supports header, param, map, fallback, lowercase.">
                            {t('settings.redirects.functionConfig')}
                          </LabelWithHelp>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value ?? ''}
                              rows={6}
                              placeholder={
                                functionName === 'acceptLanguageToParam'
                                  ? '{"param":"locale","supported":["es","en"],"fallback":"en"}'
                                  : '{"header":"x-country","param":"market","map":{"es":"spain"},"fallback":"global"}'
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            {t('settings.redirects.functionConfigHelp')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}
                </CardContent>
              </Card>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  loading={createMutation.isPending || updateMutation.isPending}
                >
                  {editing ? 'Save changes' : 'Create redirect'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
