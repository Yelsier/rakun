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
import { useSession } from '@/state/session'

export function ManagerAccountScreen() {
  const managerClient = useManagerClient()
  const { user, setUser } = useSession()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [username, setUsername] = useState(user.user)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const accountInfoQuery = useManagerQuery({
    name: 'manager.auth.accountInfo',
    input: undefined,
  })
  const updateAccountMutation = useManagerMutation('manager.auth.updateAccount')

  useEffect(() => {
    setUsername(user.user)
  }, [user.user])

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
      toast.error('Profile image must be an image file')
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
        user: username,
        avatarId,
      })

      setUser(updated)
      setAvatarFile(null)
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
        setAvatarPreview(null)
      }
      toast.success('Account updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update account')
    }
  }

  if (!accountInfoQuery.data) {
    return <Loading />
  }

  return (
    <div className="container mx-auto flex flex-col items-start gap-6 px-4 py-10">
      <Card className="w-full rounded-lg">
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle>Profile</CardTitle>
          <UpdatePassword />
        </CardHeader>
        <CardContent className="flex flex-col gap-5 md:flex-row">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={username}
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
              <Label htmlFor="account-avatar">Avatar</Label>
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload />
                Upload image
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="account-username">Username</Label>
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
            Save
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
