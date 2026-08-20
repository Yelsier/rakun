'use client'

import type { MaybeTranslatableValue } from '@rakun-kit/core/client'
import {
  Bell,
  BellRing,
  Clock3,
  GitPullRequestArrow,
  MessageCircle,
  Star,
  StarOff,
  UserRound,
  Waypoints,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import type { ManagerOperationOutput } from '@/client/operations'
import {
  createManagerQueryKey,
  useManagerMutation,
  useManagerQuery,
  useManagerSyncQuery,
} from '@/client/react'
import { createSyncTopic } from '@/client/realtime'
import { useTranslations } from '@/i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDate } from '@/helpers/formatDate'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { ManagerLink } from '@/link'
import { useLanguage } from '@/state/language'

type FavoriteItem = ManagerOperationOutput<'manager.favorites.list'>['favorites'][number]
type NotificationItem =
  ManagerOperationOutput<'manager.notifications.list'>['notifications'][number]

const HOME_NOTIFICATION_LIMIT = 5
const NOTIFICATION_HISTORY_LIMIT = 50

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

const getUpdatedBy = (
  favorite: FavoriteItem,
  t: ReturnType<typeof useTranslations>,
) =>
  favorite.updatedBy?.user || favorite.updatedBy?.email || t('common.unknown')

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
}) => {
  const t = useTranslations()
  return (
  <Card className='relative gap-3 rounded-md py-4 shadow-xs transition-colors hover:bg-accent/40'>
    <ManagerLink
      href={`/${favorite.contentType}/${favorite.documentId}`}
      className='absolute inset-0 z-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring'
    >
      <span className='sr-only'>{t('dashboard.openFavorite', { title })}</span>
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
              aria-label={t('dashboard.removeFromFavoritesTooltip')}
              className='pointer-events-auto'
              variant='ghost'
              size='icon'
              loading={removing}
              onClick={() => onRemove(favorite)}
            >
              <StarOff />
            </Button>
          </TooltipTrigger>
          <TooltipContent side='top'>{t('dashboard.removeFromFavoritesTooltip')}</TooltipContent>
        </Tooltip>
      </div>
    </CardHeader>
    <CardContent className='pointer-events-none relative z-10 grid gap-2 px-4 text-xs text-muted-foreground'>
      <div className='flex min-w-0 items-center gap-2'>
        <Clock3 className='size-3.5 shrink-0' />
        <span className='truncate'>
          {t('dashboard.lastUpdated', {
            date: favorite.updatedAt ? formatDate(favorite.updatedAt) : t('common.unknown'),
          })}
        </span>
      </div>
      <div className='flex min-w-0 items-center gap-2'>
        <UserRound className='size-3.5 shrink-0' />
        <span className='truncate'>
          {t('dashboard.lastUpdatedBy', { name: getUpdatedBy(favorite, t) })}
        </span>
      </div>
    </CardContent>
  </Card>
  )
}

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
  const t = useTranslations()
  const isRedirectNotification =
    notification.kind === 'redirect_enable_requested'
  const isReviewNotification = Boolean(
    notification.kind &&
      notification.kind !== 'comment_mention' &&
      !isRedirectNotification,
  )
  const NotificationIcon = notification.read
    ? isRedirectNotification
      ? Waypoints
      : isReviewNotification
        ? GitPullRequestArrow
        : MessageCircle
    : BellRing
  const author = notification.author.name?.trim() || notification.author.user
  const authorAction =
    notification.kind === 'review_changes_requested'
      ? 'Changes requested by'
      : notification.kind === 'review_approved'
        ? 'Approved by'
        : notification.kind === 'review_requested'
          ? 'Review requested by'
          : notification.kind === 'review_feedback'
            ? 'Feedback from'
            : notification.kind === 'redirect_enable_requested'
              ? 'Redirect enable requested by'
              : 'Mentioned by'
  const href = isRedirectNotification
    ? '/settings/redirects'
    : `/${notification.contentType}/${notification.documentId}?${
        isReviewNotification ? 'review' : 'comments'
      }=open`

  return (
    <Card
      className={
        notification.read
          ? 'relative gap-3 rounded-md py-4 shadow-xs transition-colors hover:bg-accent/40'
          : 'relative gap-3 rounded-md border-primary/40 bg-primary/5 py-4 shadow-xs transition-colors hover:bg-primary/10'
      }
    >
      <ManagerLink
        href={href}
        className='absolute inset-0 z-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring'
      >
        <span className='sr-only'>
          {t('dashboard.openNotificationFor', { title })}
        </span>
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
          <span className='truncate'>
            {authorAction} {author}
          </span>
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

const NotificationHistoryDrawer = ({
  getTranslation,
}: {
  getTranslation: <T>(object: MaybeTranslatableValue<T>) => T
}) => {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const notificationsQuery = useManagerSyncQuery({
    name: 'manager.notifications.list',
    input: {
      limit: NOTIFICATION_HISTORY_LIMIT,
    },
    enabled: open,
    syncIntervalMs: 15_000,
    topic: createSyncTopic('manager-notifications'),
  })
  const notifications = notificationsQuery.data?.notifications ?? []

  return (
    <Drawer direction='right' open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button className='ml-auto' variant='ghost' size='sm'>
          {t('dashboard.viewAll')}
        </Button>
      </DrawerTrigger>
      <DrawerContent className='h-full w-[min(92vw,520px)] sm:max-w-[520px]'>
        <DrawerHeader className='shrink-0 border-b'>
          <DrawerTitle>{t('dashboard.notifications')}</DrawerTitle>
          <DrawerDescription>
            {t('dashboard.notificationsDescription', {
              count: NOTIFICATION_HISTORY_LIMIT,
            })}
          </DrawerDescription>
        </DrawerHeader>
        <ScrollArea className='min-h-0 flex-1'>
          <div className='grid gap-3 p-4'>
            {notificationsQuery.isLoading ? (
              <FavoritesSkeleton />
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationCard
                  key={notification._id}
                  notification={notification}
                  title={getNotificationTitle(notification, getTranslation)}
                />
              ))
            ) : (
              <div className='rounded-md border border-dashed p-4 text-sm text-muted-foreground'>
                {t('dashboard.noNotifications')}
              </div>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}

export const ManagerDashboardHomeScreen = () => {
  const t = useTranslations()
  const { getTranslation } = useLanguage()
  const queryClient = useQueryClient()
  const [removingFavoriteId, setRemovingFavoriteId] = useState<string | null>(null)
  const { data, isLoading } = useManagerQuery({
    name: 'manager.favorites.list',
    input: undefined,
  })
  const notificationsQuery = useManagerSyncQuery({
    name: 'manager.notifications.list',
    input: {
      unreadOnly: true,
      limit: HOME_NOTIFICATION_LIMIT,
    },
    syncIntervalMs: 15_000,
    topic: createSyncTopic('manager-notifications'),
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
      toast.success(t('dashboard.removedFavorite'))
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('dashboard.removeFavoriteError')))
    } finally {
      setRemovingFavoriteId(null)
    }
  }
  return (
    <div className='container mx-auto grid gap-6 px-4 py-10 lg:grid-cols-2'>
      <section className='min-w-0 space-y-4'>
        <div className='flex h-11 items-center gap-2 border-b'>
          <Star className='size-4 fill-amber-400 text-amber-500' />
          <h1 className='text-sm font-semibold uppercase text-muted-foreground'>
            {t('dashboard.favorites')}
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
            {t('dashboard.noFavorites')}
          </div>
        )}
      </section>
      <section className='min-w-0 space-y-4'>
        <div className='flex h-11 items-center gap-2 border-b'>
          <Bell className='size-4 text-primary' />
          <h1 className='text-sm font-semibold uppercase text-muted-foreground'>
            {t('dashboard.notifications')}
          </h1>
          {totalUnread ? (
            <Badge variant='destructive'>
              {totalUnread}
            </Badge>
          ) : null}
          <NotificationHistoryDrawer getTranslation={getTranslation} />
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
            {t('dashboard.noUnreadNotifications')}
          </div>
        )}
      </section>
    </div>
  )
}
