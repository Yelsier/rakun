'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { z } from 'zod'

import type { ManagerUserRecord } from './columns'

import { useManagerMutation, useManagerQuery } from '@/client/react'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslations } from '@/i18n'

type Props = {
  defaultValues?: ManagerUserRecord
  refetch: () => void
  setOpen: (open: boolean) => void
}

const managerUserRoleInput = z.object({
  contentType: z.literal('ManagerRole'),
  _id: z.string(),
  type: z.literal('existing'),
})

const managerUserInput = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string(),
  user: z.string().min(1),
  role: managerUserRoleInput.nullable().optional(),
  _type: z.literal('ManagerUser'),
  twoFactorEnabled: z.boolean(),
})

type ManagerUserInput = z.infer<typeof managerUserInput>

type ManagerRoleRecord = {
  _id: string
  name?: string
}

export function EditUserForm({
  defaultValues,
  refetch,
  setOpen,
}: Props) {
  const t = useTranslations()
  const rolesQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: 'ManagerRole',
      query: { options: { limit: 'all' } },
    },
  })
  const createMutation = useManagerMutation('manager.create')
  const updateMutation = useManagerMutation('manager.update')

  const form = useForm<ManagerUserInput>({
    resolver: zodResolver(managerUserInput),
    defaultValues: {
      email: defaultValues?.email || '',
      name: defaultValues?.name || '',
      password: '',
      user: defaultValues?.user || '',
      role: defaultValues?.role
        ? {
            contentType: 'ManagerRole',
            _id: defaultValues.role._id,
            type: 'existing',
          }
        : undefined,
      _type: 'ManagerUser',
      twoFactorEnabled: false,
    },
  })

  useEffect(() => {
    form.reset({
      email: defaultValues?.email || '',
      name: defaultValues?.name || '',
      password: '',
      user: defaultValues?.user || '',
      role: defaultValues?.role
        ? {
            contentType: 'ManagerRole',
            _id: defaultValues.role._id,
            type: 'existing',
          }
        : undefined,
      _type: 'ManagerUser',
      twoFactorEnabled: false,
    })
  }, [defaultValues, form])

  const onSubmit = async (values: ManagerUserInput) => {
    try {
      if (defaultValues?._id) {
        await updateMutation.mutateAsync({
          contentType: 'ManagerUser',
          id: defaultValues._id,
          data: values,
        })
      } else {
        await createMutation.mutateAsync({
          contentType: 'ManagerUser',
          data: values,
        })
      }

      refetch()
      setOpen(false)
      toast.success(
        defaultValues?._id
          ? t('users.updated')
          : t('users.created'),
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('users.saveError'))
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => void onSubmit(values))} className='space-y-8'>
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.email')}</FormLabel>
              <FormControl>
                <Input autoComplete='off' placeholder='user@example.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fields.name')}</FormLabel>
              <FormControl>
                <Input autoComplete='off' placeholder={t('fields.name')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='user'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.username')}</FormLabel>
              <FormControl>
                <Input autoComplete='off' placeholder={t('common.username')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.password')}</FormLabel>
              <FormControl>
                <Input
                  autoComplete='off'
                  type='password'
                  placeholder={t('users.passwordPlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='role'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.role')}</FormLabel>
              <FormControl>
                <div className='flex items-center gap-2'>
                  {field.value ? (
                    <Button
                      size='icon'
                      variant='ghost'
                      onClick={(event) => {
                        event.preventDefault()
                        field.onChange(null)
                      }}
                    >
                      <X />
                    </Button>
                  ) : null}
                  <Select
                    onValueChange={(value) =>
                      field.onChange({
                        contentType: 'ManagerRole',
                        _id: value,
                        type: 'existing',
                      })
                    }
                    value={field.value?._id || ''}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder={t('users.selectRole')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(rolesQuery.data?.items as ManagerRoleRecord[] | undefined)?.map(
                        (role) => (
                          <SelectItem key={role._id} value={role._id}>
                            <span>{role.name}</span>
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type='submit' loading={createMutation.isPending || updateMutation.isPending}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
