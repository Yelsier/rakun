'use client'

import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

import { cn } from '@/lib/utils'

export type UserAvatarMedia = {
  url?: string
  previewUrl?: string
}

export type UserAvatarProps = {
  name?: string
  email?: string
  avatar?: UserAvatarMedia | null
  className?: string
  fallbackClassName?: string
}

const palette = [
  ['#0f766e', '#ecfeff'],
  ['#7c2d12', '#fff7ed'],
  ['#365314', '#f7fee7'],
  ['#1d4ed8', '#eff6ff'],
  ['#9f1239', '#fff1f2'],
  ['#6d28d9', '#f5f3ff'],
  ['#854d0e', '#fefce8'],
  ['#be123c', '#fff1f2'],
]

const hashValue = (value: string) => {
  let hash = 0

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }

  return Math.abs(hash)
}

const getInitial = (name?: string, email?: string) => {
  const value = (name || email || 'U').trim()
  return (value[0] || 'U').toUpperCase()
}

const getColors = (name?: string, email?: string) => {
  const value = name || email || 'user'
  return palette[hashValue(value) % palette.length] ?? palette[0]
}

export function UserAvatar({
  name,
  email,
  avatar,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const [background, foreground] = getColors(name, email)
  const src = avatar?.previewUrl || avatar?.url

  return (
    <Avatar className={cn('size-8', className)}>
      {src ? <AvatarImage src={src} alt={name || email || 'User'} /> : null}
      <AvatarFallback
        className={cn('font-medium', fallbackClassName)}
        style={{ backgroundColor: background, color: foreground }}
      >
        {getInitial(name, email)}
      </AvatarFallback>
    </Avatar>
  )
}
