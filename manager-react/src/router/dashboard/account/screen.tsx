'use client'

import { Save, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import Mfa from './mfa/Mfa'
import Sessions from './sessions/Sessions'

import { useManagerClient, useManagerMutation, useManagerQuery } from '@/client/react'
import Loading from '@/components/loading'
import { UserAvatar } from '@/components/user-avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UpdatePassword } from '@/components/update-password'
import { uploadMediaFile, type MediaRecord } from '@/media'
import { useTranslations } from '@/i18n'
import { useSession } from '@/state/session'

export function ManagerAccountScreen() {
  const t = useTranslations()
  const managerClient = useManagerClient()
  const { user, setUser } = useSession()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [name, setName] = useState(user.name || '')
  const [username, setUsername] = useState(user.user)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const accountInfoQuery = useManagerQuery({
    name: 'manager.auth.accountInfo',
    input: undefined,
  })
  const updateAccountMutation = useManagerMutation('manager.auth.updateAccount')

  useEffect(() => {
    setName(user.name || '')
    setUsername(user.user)
  }, [user.name, user.user])

  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    },
    [avatarPreview]
  )

  const avatarMedia = {
    _id: user.avatarId,
    url: user.avatarUrl,
    previewUrl: user.avatarPreviewUrl,
  }
  const previewAvatar = avatarPreview ? { previewUrl: avatarPreview } : avatarMedia

  const handleAvatarFile = (file: File | undefined) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error(t('account.profileImageMustBeImage'))
      return
    }

    setAvatarFile(file)
    setAvatarPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return URL.createObjectURL(file)
    })
  }

  const saveProfile = async () => {
    try {
      let avatarId = avatarMedia._id

      if (avatarFile) {
        const result = await uploadMediaFile(
          {
            file: avatarFile,
            access: 'public',
            purpose: 'profileAvatar',
            name: `${username.trim() || user.user} avatar`,
            optimizeOptions: {
              format: 'webp',
              quality: 85,
              minBytesToOptimize: 1,
              generatePreview: true,
              previewMaxWidth: 128,
              generateSizes: false,
              responsiveSizes: [],
            },
          },
          managerClient
        )
        avatarId = (result.finalized.media as MediaRecord)._id
      }

      const updated = await updateAccountMutation.mutateAsync({
        name,
        user: username,
        avatarId,
      })

      setUser(updated)
      setAvatarFile(null)
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
        setAvatarPreview(null)
      }
      toast.success(t('account.updated'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('account.updateError'))
    }
  }

  if (!accountInfoQuery.data) {
    return <Loading />
  }

  return (
    <div className="container mx-auto flex flex-col items-start gap-6 px-4 py-10">
      <Card className="w-full rounded-lg" data-tour="account-profile">
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle>{t('account.profile')}</CardTitle>
          <UpdatePassword />
        </CardHeader>
        <CardContent className="flex flex-col gap-5 md:flex-row">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={name || username}
              email={user.email}
              avatar={previewAvatar}
              className="size-16"
              fallbackClassName="text-xl"
            />
            <div className="flex flex-col   gap-2 ">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleAvatarFile(event.target.files?.[0])}
              />
              <Label htmlFor="account-avatar">{t('account.avatar')}</Label>
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload />
                {t('account.uploadImage')}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="account-name">{t('fields.name')}</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="account-username">{t('common.username')}</Label>
            <Input
              id="account-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>

          <Button
            className="md:ml-auto"
            loading={updateAccountMutation.isPending}
            onClick={() => void saveProfile()}
          >
            <Save />
            {t('common.save')}
          </Button>
        </CardContent>
      </Card>
      <Mfa {...accountInfoQuery.data} />
      <Sessions
        current={accountInfoQuery.data.currentSession}
        sessions={accountInfoQuery.data.sessions}
      />
    </div>
  )
}
