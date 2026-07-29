'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import type { ManagerRoleRecord } from './columns'

import { useManagerMutation, useManagerQuery } from '@/client/react'
import { useManagerNavigation } from '@/state/navigation'
import { decodeCamelCase } from '@/helpers/decode-camel-case'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useTranslations } from '@/i18n'

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  permissions: z.array(z.string()).optional(),
  _type: z.literal('ManagerRole'),
})

export const EditRole = ({
  defaultValues,
}: {
  defaultValues?: ManagerRoleRecord
}) => {
  const t = useTranslations()
  const permissionsQuery = useManagerQuery({
    name: 'manager.permissions',
    input: undefined,
  })
  const createMutation = useManagerMutation('manager.create')
  const updateMutation = useManagerMutation('manager.update')
  const navigation = useManagerNavigation()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      permissions: defaultValues?.permissions || [],
      _type: 'ManagerRole',
    },
  })

  const groupedPermissions = useMemo(() => {
    return (permissionsQuery.data ?? []).reduce(
      (acc, permission) => {
        const [section, type, specific] = permission.split('.')

        if (!section || !type || !specific) {
          acc.loose.push(permission)
          return acc
        }

        const group = `${section}.${type}`
        if (!acc.groups[group]) {
          acc.groups[group] = []
        }
        acc.groups[group]?.push(specific)
        return acc
      },
      {
        groups: {} as Record<string, string[]>,
        loose: [] as string[],
      },
    )
  }, [permissionsQuery.data])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (defaultValues?._id) {
        await updateMutation.mutateAsync({
          contentType: 'ManagerRole',
          id: defaultValues._id,
          data: values,
        })
        toast.success(t('settings.roles.updated'))
      } else {
        const result = await createMutation.mutateAsync({
          contentType: 'ManagerRole',
          data: values,
        })
        const id =
          typeof result === 'object' && result && '_id' in result
            ? String(result._id)
            : undefined
        toast.success(t('settings.roles.created'))
        if (id) {
          navigation.pushPath?.(`/settings/user-roles/${id}`)
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.roles.saveError'))
    }
  }

  return (
    <div className='container mx-auto px-4 py-10'>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='flex flex-col items-start gap-6'
        >
          <Button
            type='submit'
            loading={createMutation.isPending || updateMutation.isPending}
            className='self-end'
          >
            {t('common.save')}
          </Button>
          <div className='space-y-8'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.name')}</FormLabel>
                  <FormControl>
                    <Input autoComplete='off' placeholder={t('settings.roles.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='flex items-center gap-2'>
              <Switch
                id='toggle-all'
                checked={
                  (form.getValues('permissions')?.length ?? 0) ===
                  (permissionsQuery.data?.length ?? 0)
                }
                onCheckedChange={(checked) => {
                  form.setValue('permissions', checked ? permissionsQuery.data || [] : [])
                }}
              />
              <Label htmlFor='toggle-all' className='text-lg font-bold'>
                {t('settings.roles.toggleAll')}
              </Label>
            </div>
            <Separator className='my-8' />
            <div className='flex flex-wrap gap-6'>
              {Object.entries(groupedPermissions.groups).map(([group, permissions]) => (
                <div className='w-full' key={group}>
                  <h3 className='mb-4 flex items-center gap-2 text-lg font-bold'>
                    <Switch
                      checked={permissions.every((permission) =>
                        form.watch('permissions')?.includes(`${group}.${permission}`),
                      )}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          form.setValue(
                            'permissions',
                            Array.from(
                              new Set([
                                ...(form.getValues('permissions') || []),
                                ...permissions.map((permission) => `${group}.${permission}`),
                              ]),
                            ),
                          )
                        } else {
                          form.setValue(
                            'permissions',
                            (form.getValues('permissions') || []).filter(
                              (value) =>
                                !permissions.some(
                                  (permission) => value === `${group}.${permission}`,
                                ),
                            ),
                          )
                        }
                      }}
                    />
                    {decodeCamelCase(group).replaceAll('.', ' ')}
                  </h3>
                  <Card>
                    <CardContent className='grid grid-cols-4 gap-2'>
                      {permissions.map((permission) => {
                        const fullPermission = `${group}.${permission}`
                        const disabledWrite =
                          group.startsWith('content.') &&
                          permission !== 'own' &&
                          permission !== 'readAny' &&
                          !form.watch('permissions')?.includes(`${group}.own`) &&
                          !form.watch('permissions')?.includes(`${group}.readAny`)

                        return (
                          <FormField
                            key={fullPermission}
                            control={form.control}
                            name='permissions'
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <FormLabel htmlFor={fullPermission}>
                                    <Checkbox
                                      id={fullPermission}
                                      disabled={disabledWrite}
                                      checked={field.value?.includes(fullPermission)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([
                                            ...(field.value || []),
                                            fullPermission,
                                          ])
                                          return
                                        }

                                        let finalList =
                                          field.value?.filter(
                                            (value) => value !== fullPermission,
                                          ) || []

                                        if (
                                          permission === 'own' ||
                                          permission === 'readAny'
                                        ) {
                                          if (
                                            !finalList.includes(`${group}.own`) &&
                                            !finalList.includes(`${group}.readAny`)
                                          ) {
                                            finalList = finalList.filter(
                                              (value) =>
                                                value !== `${group}.updateAny` &&
                                                value !== `${group}.deleteAny`,
                                            )
                                          }
                                        }

                                        field.onChange(finalList)
                                      }}
                                    />
                                    <span className='ml-2'>{permission}</span>
                                  </FormLabel>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )
                      })}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
