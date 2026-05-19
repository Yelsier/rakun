'use client'

import type { Permission } from '@rakun-kit/core/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bot, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { columns, type RobotsRuleManager } from './columns'

import { useManagerMutation, useManagerQuery } from '@/client/react'
import Loading from '@/components/loading'
import { PaginationController } from '@/components/PaginationController'
import UnauthorizedMessage from '@/components/unauthorized'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useSession } from '@/state/session'

const formSchema = z
  .object({
    _type: z.literal('RobotsRule'),
    name: z.string().min(1),
    enabled: z.boolean(),
    directive: z.enum(['allow', 'disallow', 'crawlDelay', 'sitemap', 'host', 'comment']),
    userAgent: z.string().min(1),
    path: z.string().optional(),
    value: z.string().optional(),
    crawlDelay: z.number().min(0).optional(),
    order: z.number(),
  })
  .superRefine((data, ctx) => {
    if ((data.directive === 'allow' || data.directive === 'disallow') && !data.path?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['path'], message: 'Path is required.' })
    }
    if ((data.directive === 'sitemap' || data.directive === 'host' || data.directive === 'comment') && !data.value?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'Value is required.' })
    }
    if (data.directive === 'crawlDelay' && typeof data.crawlDelay !== 'number') {
      ctx.addIssue({ code: 'custom', path: ['crawlDelay'], message: 'Crawl delay is required.' })
    }
  })

type RobotsRuleFormValues = z.infer<typeof formSchema>

const defaultValues: RobotsRuleFormValues = {
  _type: 'RobotsRule',
  name: '',
  enabled: true,
  directive: 'disallow',
  userAgent: '*',
  path: '/',
  value: '',
  crawlDelay: undefined,
  order: 100,
}

export const ManagerSettingsRobotsScreen = () => {
  const { user, hasPermissions } = useSession()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [editing, setEditing] = useState<RobotsRuleManager | null>(null)
  const [deleting, setDeleting] = useState<RobotsRuleManager | null>(null)

  const listQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: 'RobotsRule',
      query: { options: { limit: itemsPerPage, page, sort: { order: 'asc' } } },
    },
  })
  const createMutation = useManagerMutation('manager.create')
  const updateMutation = useManagerMutation('manager.update')
  const deleteMutation = useManagerMutation('manager.delete')

  const form = useForm<RobotsRuleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })
  const directive = form.watch('directive')

  const canCreate = hasPermissions(['content.RobotsRule.own' as Permission])
  const canUpdateAny = hasPermissions(['content.RobotsRule.updateAny' as Permission])
  const canDeleteAny = hasPermissions(['content.RobotsRule.deleteAny' as Permission])

  useEffect(() => {
    if (!open) {
      setEditing(null)
      form.reset(defaultValues)
    }
  }, [open, form])

  const canEditItem = (item: RobotsRuleManager) =>
    Boolean(canUpdateAny || (item.createdBy && item.createdBy === user._id))

  const canDeleteItem = (item: RobotsRuleManager) =>
    Boolean(canDeleteAny || (item.createdBy && item.createdBy === user._id))

  const openForCreate = () => {
    form.reset(defaultValues)
    setEditing(null)
    setOpen(true)
  }

  const openForEdit = (item: RobotsRuleManager) => {
    setEditing(item)
    form.reset({
      _type: 'RobotsRule',
      name: item.name,
      enabled: item.enabled,
      directive: item.directive,
      userAgent: item.userAgent || '*',
      path: item.path || '',
      value: item.value || '',
      crawlDelay: item.crawlDelay,
      order: item.order,
    })
    setOpen(true)
  }

  const onSubmit = async (values: RobotsRuleFormValues) => {
    const payload = {
      ...values,
      path: values.path?.trim() || undefined,
      value: values.value?.trim() || undefined,
      crawlDelay: values.directive === 'crawlDelay' ? values.crawlDelay : undefined,
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          contentType: 'RobotsRule',
          id: editing._id,
          data: payload,
        })
        toast.success('Robots rule updated')
      } else {
        await createMutation.mutateAsync({
          contentType: 'RobotsRule',
          data: payload,
        })
        toast.success('Robots rule created')
      }
      await listQuery.refetch()
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error saving robots rule')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteMutation.mutateAsync({
        contentType: 'RobotsRule',
        id: deleting._id,
      })
      toast.success('Robots rule deleted')
      await listQuery.refetch()
      setDeleting(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error deleting robots rule')
    }
  }

  if (!hasPermissions(['content.RobotsRule.readAny' as Permission])) {
    return <UnauthorizedMessage neededPermission={['content.RobotsRule.readAny' as Permission]} />
  }

  if (!listQuery.data) return <Loading />

  return (
    <div className='container mx-auto flex flex-col gap-6 px-4 py-10'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Bot className='h-5 w-5' />
            Robots.txt
          </CardTitle>
          <CardDescription>
            Configure crawler rules, crawl delays, sitemap hints and host directives.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className='flex justify-end'>
        {canCreate ? (
          <Button onClick={openForCreate}>
            <Plus className='mr-1 h-4 w-4' /> New rule
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns({
          onEdit: openForEdit,
          onDelete: setDeleting,
          canEditItem,
          canDeleteItem,
        })}
        data={listQuery.data.items as RobotsRuleManager[]}
      />
      <PaginationController
        page={page}
        setPage={setPage}
        totalItems={listQuery.data.totalItems}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-h-[85vh] w-screen max-w-3xl! overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit robots rule' : 'Create robots rule'}</DialogTitle>
            <DialogDescription>Rules are rendered by order and grouped by user-agent.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_11rem] md:items-start'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder='Block private files' />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='enabled'
                  render={({ field }) => (
                    <FormItem >
                      <FormLabel>Enabled</FormLabel>
                      <FormControl>
                        <div className='flex h-9 items-center gap-2'>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                          <Label>{field.value ? 'Active' : 'Inactive'}</Label>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-[13rem_minmax(0,1fr)_10rem] md:items-start'>
                <FormField
                  control={form.control}
                  name='directive'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Directive</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className='w-full'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='allow'>Allow</SelectItem>
                            <SelectItem value='disallow'>Disallow</SelectItem>
                            <SelectItem value='crawlDelay'>Crawl-delay</SelectItem>
                            <SelectItem value='sitemap'>Sitemap</SelectItem>
                            <SelectItem value='host'>Host</SelectItem>
                            <SelectItem value='comment'>Comment</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='userAgent'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User-agent</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={['sitemap', 'host', 'comment'].includes(directive)}
                          placeholder='*'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='order'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          value={field.value}
                          onChange={(event) => field.onChange(Number(event.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {directive === 'allow' || directive === 'disallow' ? (
                <FormField
                  control={form.control}
                  name='path'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Path</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder='/private/' />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              {directive === 'crawlDelay' ? (
                <FormField
                  control={form.control}
                  name='crawlDelay'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Crawl delay</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          value={field.value ?? ''}
                          onChange={(event) =>
                            field.onChange(event.target.value ? Number(event.target.value) : undefined)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              {['sitemap', 'host', 'comment'].includes(directive) ? (
                <FormField
                  control={form.control}
                  name='value'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          placeholder={
                            directive === 'sitemap'
                              ? 'https://example.com/sitemap.xml'
                              : directive === 'host'
                                ? 'example.com'
                                : 'Generated by Rakun'
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <DialogFooter>
                <Button type='button' variant='ghost' onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type='submit' loading={createMutation.isPending || updateMutation.isPending}>
                  {editing ? 'Save changes' : 'Create rule'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(value) => !value && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete robots rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className='font-medium'>{deleting?.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type='button' variant='ghost' onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant='destructive' loading={deleteMutation.isPending} onClick={() => void handleDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
