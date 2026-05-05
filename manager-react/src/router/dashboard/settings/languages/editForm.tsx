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
    .nullable(),
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
    try {
      if (defaultValues?._id) {
        await updateMutation.mutateAsync({
          contentType: 'Language',
          id: defaultValues._id,
          data: values,
        })
        toast.success('Language updated successfully!')
      } else {
        await createMutation.mutateAsync({
          contentType: 'Language',
          data: values,
        })
        toast.success('Language created successfully!')
      }

      refetch()
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error saving language')
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
              <FormLabel>Code</FormLabel>
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
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input autoComplete='off' placeholder='English' {...field} />
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
              <FormLabel>Parent</FormLabel>
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
                  <SelectValue placeholder='Select parent language' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>No parent</SelectItem>
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
            Save
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

