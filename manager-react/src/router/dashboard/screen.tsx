'use client'

import type { MaybeTranslatableValue } from '@rakun-kit/core/client'
import {
  Bell,
  BellRing,
  Clock3,
  MessageCircle,
  Star,
  StarOff,
  UserRound,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import type { ManagerOperationOutput } from '@/client/operations'
import {
  createManagerQueryKey,
  useManagerMutation,
  useManagerQuery,
} from '@/client/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDate } from '@/helpers/formatDate'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { ManagerLink } from '@/link'
import { useLanguage } from '@/state/language'

type FavoriteItem = ManagerOperationOutput<'manager.favorites.list'>['favorites'][number]
type NotificationItem =
  ManagerOperationOutput<'manager.notifications.list'>['notifications'][number]

const fallbackTitle = (favorite: FavoriteItem) =>
  `${favorite.contentType} ${favorite.documentId.slice(-6)}`

const getFavoriteTitle = (
  favorite: FavoriteItem,
  getTranslation: <T>(object: MaybeTranslatableValue<T>) => T,
) => {
  if (typeof favorite.title === 'string' && favorite.title.trim()) {
    return favorite.title
  }

  if (favorite.title !== undefined && favorite.title !== null) {
    const translated = getTranslation(
      favorite.title as MaybeTranslatableValue<string>,
    )

    if (typeof translated === 'string' && translated.trim()) {
      return translated
    }
  }

  return fallbackTitle(favorite)
}

const getUpdatedBy = (favorite: FavoriteItem) =>
  favorite.updatedBy?.user || favorite.updatedBy?.email || 'Unknown'

const FavoriteCard = ({
  favorite,
  removing,
  onRemove,
  title,
}: {
  favorite: FavoriteItem
  removing: boolean
  onRemove: (favorite: FavoriteItem) => void
  title: string
}) => (
  <Card className='relative gap-3 rounded-md py-4 shadow-xs transition-colors hover:bg-accent/40'>
    <ManagerLink
      href={`/${favorite.contentType}/${favorite.documentId}`}
      className='absolute inset-0 z-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring'
    >
      <span className='sr-only'>Open {title}</span>
    </ManagerLink>
    <CardHeader className='pointer-events-none relative z-10 gap-2 px-4'>
      <div className='grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3'>
        <div className='min-w-0'>
          <CardTitle className='min-w-0 truncate text-sm leading-5'>{title}</CardTitle>
          <Badge variant='outline' className='mt-2 max-w-full truncate'>
            {favorite.contentType}
          </Badge>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label='Remove from favorites'
              className='pointer-events-auto'
              variant='ghost'
              size='icon'
              loading={removing}
              onClick={() => onRemove(favorite)}
            >
              <StarOff />
            </Button>
          </TooltipTrigger>
          <TooltipContent side='top'>Remove from favorites</TooltipContent>
        </Tooltip>
      </div>
    </CardHeader>
    <CardContent className='pointer-events-none relative z-10 grid gap-2 px-4 text-xs text-muted-foreground'>
      <div className='flex min-w-0 items-center gap-2'>
        <Clock3 className='size-3.5 shrink-0' />
        <span className='truncate'>
          Last updated {favorite.updatedAt ? formatDate(favorite.updatedAt) : 'Unknown'}
        </span>
      </div>
      <div className='flex min-w-0 items-center gap-2'>
        <UserRound className='size-3.5 shrink-0' />
        <span className='truncate'>Last updated by {getUpdatedBy(favorite)}</span>
      </div>
    </CardContent>
  </Card>
)

const FavoritesSkeleton = () => (
  <div className='grid gap-3'>
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className='rounded-md border p-4'>
        <div className='flex items-center justify-between gap-3'>
          <Skeleton className='h-4 w-36' />
          <Skeleton className='h-5 w-16' />
        </div>
        <div className='mt-4 grid gap-2'>
          <Skeleton className='h-3 w-48' />
          <Skeleton className='h-3 w-40' />
        </div>
      </div>
    ))}
  </div>
)

const fallbackNotificationTitle = (notification: NotificationItem) =>
  `${notification.contentType} ${notification.documentId.slice(-6)}`

const getNotificationTitle = (
  notification: NotificationItem,
  getTranslation: <T>(object: MaybeTranslatableValue<T>) => T,
) => {
  if (typeof notification.title === 'string' && notification.title.trim()) {
    return notification.title
  }

  if (notification.title !== undefined && notification.title !== null) {
    const translated = getTranslation(
      notification.title as MaybeTranslatableValue<string>,
    )

    if (typeof translated === 'string' && translated.trim()) {
      return translated
    }
  }

  return fallbackNotificationTitle(notification)
}

const NotificationCard = ({
  notification,
  title,
}: {
  notification: NotificationItem
  title: string
}) => {
  const NotificationIcon = notification.read ? MessageCircle : BellRing
  const author = notification.author.name?.trim() || notification.author.user

  return (
    <Card
      className={
        notification.read
          ? 'relative gap-3 rounded-md py-4 shadow-xs transition-colors hover:bg-accent/40'
          : 'relative gap-3 rounded-md border-primary/40 bg-primary/5 py-4 shadow-xs transition-colors hover:bg-primary/10'
      }
    >
      <ManagerLink
        href={`/${notification.contentType}/${notification.documentId}?comments=open`}
        className='absolute inset-0 z-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring'
      >
        <span className='sr-only'>Open notification for {title}</span>
      </ManagerLink>
      <CardHeader className='pointer-events-none relative z-10 gap-2 px-4'>
        <div className='flex min-w-0 items-start gap-3'>
          <NotificationIcon
            className={
              notification.read
                ? 'mt-0.5 size-4 shrink-0 text-muted-foreground'
                : 'mt-0.5 size-4 shrink-0 text-primary'
            }
          />
          <div className='min-w-0'>
            <CardTitle className='truncate text-sm leading-5'>{title}</CardTitle>
            <Badge variant='outline' className='mt-2 max-w-full truncate'>
              {notification.contentType}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className='pointer-events-none relative z-10 grid gap-2 px-4 text-xs text-muted-foreground'>
        <p className='line-clamp-2 text-sm text-foreground'>{notification.text}</p>
        <div className='flex min-w-0 items-center gap-2'>
          <UserRound className='size-3.5 shrink-0' />
          <span className='truncate'>Mentioned by {author}</span>
        </div>
        <div className='flex min-w-0 items-center gap-2'>
          <Clock3 className='size-3.5 shrink-0' />
          <span className='truncate'>
            {notification.createdAt ? formatDate(notification.createdAt) : 'Unknown date'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export const ManagerDashboardHomeScreen = () => {
  const { getTranslation } = useLanguage()
  const queryClient = useQueryClient()
  const [removingFavoriteId, setRemovingFavoriteId] = useState<string | null>(null)
  const { data, isLoading } = useManagerQuery({
    name: 'manager.favorites.list',
    input: undefined,
  })
  const notificationsQuery = useManagerQuery({
    name: 'manager.notifications.list',
    input: undefined,
    refetchInterval: 15000,
  })
  const toggleFavoriteMutation = useManagerMutation('manager.favorites.toggle')
  const favorites = data?.favorites ?? []
  const notifications = notificationsQuery.data?.notifications ?? []
  const totalUnread = notificationsQuery.data?.totalUnread ?? 0
  const removeFavorite = async (favorite: FavoriteItem) => {
    setRemovingFavoriteId(`${favorite.contentType}:${favorite.documentId}`)

    try {
      await toggleFavoriteMutation.mutateAsync({
        contentType: favorite.contentType,
        documentId: favorite.documentId,
        favorite: false,
      })
      await queryClient.invalidateQueries({
        queryKey: createManagerQueryKey('manager.favorites.list', undefined),
      })
      toast.success('Removed from favorites')
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not remove favorite'))
    } finally {
      setRemovingFavoriteId(null)
    }
  }
  return (
    <div className='container mx-auto grid gap-6 px-4 py-10 lg:grid-cols-2'>
      <section className='min-w-0 space-y-4'>
        <div className='flex items-center gap-2 border-b pb-3'>
          <Star className='size-4 fill-amber-400 text-amber-500' />
          <h1 className='text-sm font-semibold uppercase text-muted-foreground'>
            Favorites
          </h1>
        </div>
        {isLoading ? (
          <FavoritesSkeleton />
        ) : favorites.length > 0 ? (
          <div className='grid gap-3'>
            {favorites.map((favorite) => (
              <FavoriteCard
                key={`${favorite.contentType}:${favorite.documentId}`}
                favorite={favorite}
                removing={
                  removingFavoriteId === `${favorite.contentType}:${favorite.documentId}`
                }
                onRemove={(item) => void removeFavorite(item)}
                title={getFavoriteTitle(favorite, getTranslation)}
              />
            ))}
          </div>
        ) : (
          <div className='rounded-md border border-dashed p-4 text-sm text-muted-foreground'>
            No favorites yet
          </div>
        )}
      </section>
      <section className='min-w-0 space-y-4'>
        <div className='flex items-center gap-2 border-b pb-3'>
          <Bell className='size-4 text-primary' />
          <h1 className='text-sm font-semibold uppercase text-muted-foreground'>
            Notifications
          </h1>
          {totalUnread ? (
            <Badge className='ml-auto' variant='destructive'>
              {totalUnread}
            </Badge>
          ) : null}
        </div>
        {notificationsQuery.isLoading ? (
          <FavoritesSkeleton />
        ) : notifications.length > 0 ? (
          <div className='grid gap-3'>
            {notifications.map((notification) => (
              <NotificationCard
                key={notification._id}
                notification={notification}
                title={getNotificationTitle(notification, getTranslation)}
              />
            ))}
          </div>
        ) : (
          <div className='rounded-md border border-dashed p-4 text-sm text-muted-foreground'>
            No notifications yet
          </div>
        )}
      </section>
    </div>
  )
}
