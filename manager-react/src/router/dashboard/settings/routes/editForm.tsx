'use client'

import type { MaybeTranslatableValue } from '@rakun-kit/core/client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import type { ManagerRouteRecord } from './columns'

import { useManagerMutation } from '@/client/react'
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
import { useTranslations } from '@/i18n'
import { useLanguage } from '@/state/language'

const formSchema = z.object({
  basePath: z.record(z.string(), z.string()).and(z.object({ _tag: z.literal('Translatable') })),
})

export const EditRouteForm = ({
  defaultValues,
  refetch,
  setOpen,
}: {
  defaultValues?: ManagerRouteRecord
  refetch: () => void
  setOpen: (open: boolean) => void
}) => {
  const t = useTranslations()
  const { language } = useLanguage()
  const mutation = useManagerMutation('manager.update')
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      basePath:
        (defaultValues?.basePath as Record<string, string> | undefined) ?? {
          _tag: 'Translatable',
          [language.code]: '',
        },
    },
  })

  useEffect(() => {
    form.reset({
      basePath:
        (defaultValues?.basePath as Record<string, string> | undefined) ?? {
          _tag: 'Translatable',
          [language.code]: '',
        },
    })
  }, [defaultValues, form, language.code])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!defaultValues) return

    try {
      await mutation.mutateAsync({
        contentType: 'Route',
        id: defaultValues._id,
        data: values,
      })
      toast.success(t('settings.routes.updated'))
      refetch()
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.routes.updateError'))
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <FormLabel>{t('common.contentType')}</FormLabel>
            <Input value={defaultValues?.contentType || ''} disabled />
          </div>
          <div className='space-y-2'>
            <FormLabel>{t('common.field')}</FormLabel>
            <Input value={defaultValues?.field || ''} disabled />
          </div>
          <div className='space-y-2'>
            <FormLabel>{t('settings.routes.parentRelationField')}</FormLabel>
            <Input value={defaultValues?.parentRelationField || ''} disabled />
          </div>
        </div>

        <FormField
          control={form.control}
          name='basePath'
          render={({ field }) => {
            const value = field.value as MaybeTranslatableValue<string> & Record<string, string>
            return (
              <FormItem>
                <FormLabel>{t('settings.routes.literalPath')}</FormLabel>
                <FormControl>
                  <Input
                    type='text'
                    value={value[language.code] || ''}
                    onChange={(event) =>
                      {
                        const currentValue =
                          typeof value === 'object' && value !== null ? value : {}
                        field.onChange({
                          ...currentValue,
                          _tag: 'Translatable',
                          [language.code]: event.target.value
                            .replaceAll(' ', '-')
                            .replaceAll(/[^\w-]+/g, '')
                            .toLowerCase(),
                        })
                      }
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        <DialogFooter>
          <Button type='button' variant='ghost' onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button type='submit' loading={mutation.isPending}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
