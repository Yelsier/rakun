'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import type { ManagerLanguageRecord } from './columns'

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

const languageFormSchema = z.object({
  _type: z.literal('Language'),
  code: z.string().min(2),
  name: z.string().min(1),
  parent: z
    .object({
      contentType: z.literal('Language'),
      _id: z.string(),
      type: z.literal('self'),
    })
    .nullable()
    .optional(),
  default: z.boolean().optional(),
})

type LanguageFormValues = z.infer<typeof languageFormSchema>

export const EditLanguageForm = ({
  defaultValues,
  refetch,
  setOpen,
}: {
  defaultValues?: ManagerLanguageRecord
  refetch: () => void
  setOpen: (open: boolean) => void
}) => {
  const t = useTranslations()
  const languageListQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: 'Language',
      query: { options: { limit: 'all' } },
    },
  })
  const createMutation = useManagerMutation('manager.create')
  const updateMutation = useManagerMutation('manager.update')

  const form = useForm<LanguageFormValues>({
    resolver: zodResolver(languageFormSchema),
    defaultValues: {
      _type: 'Language',
      code: defaultValues?.code ?? '',
      name: defaultValues?.name ?? '',
      parent: defaultValues?.parent?._id
        ? {
            contentType: 'Language',
            _id: defaultValues.parent._id,
            type: 'self',
          }
        : null,
      default: defaultValues?.default ?? false,
    },
  })

  useEffect(() => {
    form.reset({
      _type: 'Language',
      code: defaultValues?.code ?? '',
      name: defaultValues?.name ?? '',
      parent: defaultValues?.parent?._id
        ? {
            contentType: 'Language',
            _id: defaultValues.parent._id,
            type: 'self',
          }
        : null,
      default: defaultValues?.default ?? false,
    })
  }, [defaultValues, form])

  const onSubmit = async (values: LanguageFormValues) => {
    const data = { ...values }

    if (!defaultValues?._id && data.parent === null) {
      delete data.parent
    }

    try {
      if (defaultValues?._id) {
        await updateMutation.mutateAsync({
          contentType: 'Language',
          id: defaultValues._id,
          data,
        })
        toast.success(t('settings.languages.updated'))
      } else {
        await createMutation.mutateAsync({
          contentType: 'Language',
          data,
        })
        toast.success(t('settings.languages.created'))
      }

      refetch()
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.languages.saveError'))
    }
  }

  const languages = (languageListQuery.data?.items ?? []) as ManagerLanguageRecord[]

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <FormField
          control={form.control}
          name='code'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.code')}</FormLabel>
              <FormControl>
                <Input autoComplete='off' placeholder='en' {...field} />
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
                <Input autoComplete='off' placeholder={t('settings.languages.namePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='parent'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.parent')}</FormLabel>
              <Select
                onValueChange={(value) =>
                  field.onChange(
                    value === '__none__'
                      ? null
                      : {
                          contentType: 'Language',
                          _id: value,
                          type: 'self',
                        },
                  )
                }
                value={field.value?._id ?? '__none__'}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder={t('settings.languages.selectParent')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>{t('settings.languages.noParent')}</SelectItem>
                  {languages
                    .filter(
                      (lang) =>
                        lang._id !== defaultValues?._id &&
                        lang.parent?._id !== defaultValues?._id,
                    )
                    .map((lang) => (
                      <SelectItem key={lang._id} value={lang._id}>
                        {lang.code} {lang.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button
            type='submit'
            loading={createMutation.isPending || updateMutation.isPending}
          >
            {t('common.save')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
