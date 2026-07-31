'use client'

import { ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { useManagerMutation, useManagerQuery } from '@/client/react'
import Loading from '@/components/loading'
import UnauthorizedMessage from '@/components/unauthorized'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { useTranslations } from '@/i18n'
import { useSession } from '@/state/session'

const permission = 'auth.ipBlocks.manage'

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value))

export const ManagerSettingsSecurityScreen = () => {
  const t = useTranslations()
  const { hasPermissions } = useSession()
  const allowed = hasPermissions([permission])
  const query = useManagerQuery({
    name: 'manager.auth.ipBlocks.list',
    input: undefined,
    enabled: allowed,
  })
  const unblock = useManagerMutation('manager.auth.ipBlocks.unblock')

  if (!allowed) return <UnauthorizedMessage neededPermission={[permission]} />
  if (query.isLoading) return <Loading />
  if (query.isError) {
    return <p className="p-6 text-destructive">{t('settings.security.loadError')}</p>
  }

  const unblockIp = async (id: string) => {
    try {
      await unblock.mutateAsync({ id })
      await query.refetch()
      toast.success(t('settings.security.unblocked'))
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('settings.security.unblockError')))
    }
  }

  const data = query.data

  return (
    <div className="container mx-auto flex flex-col gap-6 py-10">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldCheck />
            <CardTitle>{t('settings.security.title')}</CardTitle>
          </div>
          <CardDescription>
            {data?.maxAttempts
              ? t('settings.security.description', { count: data.maxAttempts })
              : t('settings.security.disabled')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.items.length ? (
            <p className="text-muted-foreground">{t('settings.security.noBlockedIps')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings.security.ip')}</TableHead>
                  <TableHead>{t('settings.security.attempts')}</TableHead>
                  <TableHead>{t('settings.security.lastFailedAt')}</TableHead>
                  <TableHead>{t('settings.security.blockedAt')}</TableHead>
                  <TableHead className="text-right">{t('settings.security.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.ip}</TableCell>
                    <TableCell>{item.failedAttempts}</TableCell>
                    <TableCell>{formatDateTime(item.lastFailedAt)}</TableCell>
                    <TableCell>{formatDateTime(item.blockedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        loading={unblock.isPending && unblock.variables?.id === item.id}
                        onClick={() => void unblockIp(item.id)}
                        size="sm"
                        variant="outline"
                      >
                        {t('settings.security.unblock')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.security.recentFailures')}</CardTitle>
          <CardDescription>{t('settings.security.recentFailuresDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.recentFailures.length ? (
            <p className="text-muted-foreground">{t('settings.security.noRecentFailures')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings.security.occurredAt')}</TableHead>
                  <TableHead>{t('settings.security.ip')}</TableHead>
                  <TableHead>{t('settings.security.attempts')}</TableHead>
                  <TableHead>{t('settings.security.result')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentFailures.map((failure) => (
                  <TableRow key={failure.id}>
                    <TableCell>{formatDateTime(failure.occurredAt)}</TableCell>
                    <TableCell className="font-mono">
                      {failure.ip ?? t('settings.security.unknownIp')}
                    </TableCell>
                    <TableCell>{failure.failedAttempts}</TableCell>
                    <TableCell>
                      <Badge variant={failure.blocked ? 'destructive' : 'outline'}>
                        {failure.blocked
                          ? t('settings.security.blocked')
                          : t('settings.security.failed')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
