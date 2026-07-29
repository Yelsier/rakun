'use client'
import { useManagerMutation } from '@/client/react'
import { UpdatePasswordInput, updatePasswordInput } from '@rakun-kit/core/contracts'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import z from 'zod'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useTranslations } from '@/i18n'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'

export const UpdatePassword = () => {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  type UpdatePasswordFormValues = UpdatePasswordInput & {
    confirmNewPassword: string
  }

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(
      updatePasswordInput
        .and(
          z.object({
            confirmNewPassword: updatePasswordInput.shape.newPassword,
          }),
        )
        .refine((data) => data.newPassword === data.confirmNewPassword, {
          message: t('account.password.mismatch'),
          path: ['confirmNewPassword'],
        }),
    ),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  })

  const { mutate, isPending } = useManagerMutation(
    'manager.auth.updatePassword',
  )

  function onSubmit(values: UpdatePasswordFormValues) {
    mutate(values, {
      onSuccess() {
        form.reset()
        setOpen(false)
        toast.success(t('account.password.updated'))
      },
      onError(error) {
        toast.error(
          t('account.password.updateError', { reason: error.message }),
        )
      },
    })
  }

  useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [open, form])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{t('account.password.update')}</Button>
      </DialogTrigger>
      <DialogContent aria-describedby={t('account.password.editDescription')}>
        <DialogHeader>
          <DialogTitle>{t('account.password.editTitle')}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {t('account.password.editDescription')}
        </DialogDescription>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('account.password.current')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="off"
                      placeholder={t('account.password.current')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('account.password.new')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="off"
                      placeholder={t('account.password.new')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('account.password.confirmNew')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="off"
                      placeholder={t('account.password.confirmNew')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" loading={isPending}>
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
