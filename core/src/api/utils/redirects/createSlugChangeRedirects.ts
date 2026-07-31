import { Redirect } from '../../../internal-content-types'
import type { ManagerUserSchema } from '../../../internal-content-types/ManagerUser'
import { isAdminRole } from '../../../lib/ManagerRolePolicy'
import {
  getContentPermission,
  hasPermissions,
  type Permission,
} from '../../../lib/Permissions'
import type { DBOutput } from '../../../lib/types'
import { getMongoService } from '../../../orm'
import type { SlugPathChange } from '../../../schemas/manager/slugRedirects'
import {
  createManagerNotification,
  type ManagerNotificationKind,
} from '../managerNotifications'
import { loadUsersWithRoles } from '../reviews'

const REDIRECT_ENABLE_KIND: ManagerNotificationKind =
  'redirect_enable_requested'

type SimpleRedirect = DBOutput<typeof Redirect>

const buildRedirectPayload = ({
  change,
  enabled,
  actorId,
}: {
  change: SlugPathChange
  enabled: boolean
  actorId: string
}) => ({
  _type: Redirect.name,
  name: `Slug change: ${change.from} → ${change.to}`,
  enabled,
  sourcePath: change.from,
  destinationPath: change.to,
  statusMode: '301' as const,
  preserveQuery: true,
  headerName: '',
  headerMatchMode: 'none' as const,
  headerValue: '',
  functionName: 'none' as const,
  functionConfig: '',
  createdBy: actorId,
  updatedBy: actorId,
})

const canCreateRedirect = (user: ManagerUserSchema) => {
  const createPermission = getContentPermission(Redirect, 'own')
  if (!createPermission) return true
  return hasPermissions(user, [createPermission as Permission])
}

const canEnableRedirect = (user: {
  role: { name: string; permissions: string[] }
}) => {
  if (isAdminRole(user.role)) return true
  const updateAny = getContentPermission(Redirect, 'updateAny')
  if (!updateAny) return false
  return hasPermissions(
    {
      role: {
        name: user.role.name,
        permissions: user.role.permissions,
      },
    } as ManagerUserSchema,
    [updateAny as Permission],
  )
}

const isSimplePathRedirect = (item: SimpleRedirect) => {
  const headerName =
    typeof item.headerName === 'string' ? item.headerName.trim() : ''
  const headerMatchMode = item.headerMatchMode ?? 'none'
  return headerName === '' && headerMatchMode === 'none'
}

const findRedirectBySourcePath = async (sourcePath: string) => {
  const db = await getMongoService()
  const existing = await db.list(Redirect, {
    filter: { sourcePath } as never,
    options: { limit: 'all' },
  })

  return existing.items.find(isSimplePathRedirect) ?? null
}

const listSimpleRedirectsByDestination = async (destinationPath: string) => {
  const db = await getMongoService()
  const existing = await db.list(Redirect, {
    filter: { destinationPath } as never,
    options: { limit: 'all' },
  })

  return existing.items.filter(isSimplePathRedirect)
}

const notifyRedirectEnableRequested = async ({
  redirectId,
  authorId,
  sourceContentType,
  sourceDocumentId,
  change,
}: {
  redirectId: string
  authorId: string
  sourceContentType: string
  sourceDocumentId: string
  change: SlugPathChange
}) => {
  const recipients = (await loadUsersWithRoles()).filter(
    (user) => canEnableRedirect(user) && user._id !== authorId,
  )

  await Promise.all(
    recipients.map((user) =>
      createManagerNotification({
        userId: user._id,
        authorId,
        eventId: redirectId,
        kind: REDIRECT_ENABLE_KIND,
        contentType: 'Redirect',
        documentId: redirectId,
        text: `Enable permanent redirect ${change.from} → ${change.to} for ${sourceContentType}/${sourceDocumentId}`,
      }),
    ),
  )
}

export const createSlugChangeRedirects = async ({
  changes,
  user,
  sourceContentType,
  sourceDocumentId,
}: {
  changes: readonly SlugPathChange[]
  user: ManagerUserSchema
  sourceContentType: string
  sourceDocumentId: string
}) => {
  if (changes.length === 0) return []

  const db = await getMongoService()
  const enabled = canCreateRedirect(user)
  const results: Array<{
    _id: string
    enabled: boolean
    from: string
    to: string
  }> = []

  for (const change of changes) {
    if (change.from === change.to) continue

    // Reclaiming `to`: that path becomes live again, so any redirect whose
    // source is `to` must go (e.g. h1→h2 then back to h1 deletes h1→h2).
    const reclaiming = await findRedirectBySourcePath(change.to)
    if (reclaiming) {
      await db.delete(
        Redirect,
        { _id: reclaiming._id },
        { actorId: user._id, reason: 'slug change redirect reclaim' },
      )
    }

    // Compounding: anything that pointed at the old live path should follow
    // the new one (A→B then B→C becomes A→C and B→C).
    const incoming = await listSimpleRedirectsByDestination(change.from)
    for (const redirect of incoming) {
      if (redirect.sourcePath === change.to) {
        await db.delete(
          Redirect,
          { _id: redirect._id },
          { actorId: user._id, reason: 'slug change redirect self-loop' },
        )
        continue
      }

      await db.update(
        Redirect,
        redirect._id,
        {
          name: `Slug change: ${redirect.sourcePath} → ${change.to}`,
          destinationPath: change.to,
          statusMode: '301',
          preserveQuery: true,
          updatedBy: user._id,
        },
        { actorId: user._id, reason: 'slug change redirect compound' },
      )
    }

    const payload = buildRedirectPayload({
      change,
      enabled,
      actorId: user._id,
    })
    const existing = await findRedirectBySourcePath(change.from)

    const redirect = existing
      ? await db.update(
          Redirect,
          existing._id,
          {
            name: payload.name,
            destinationPath: payload.destinationPath,
            statusMode: payload.statusMode,
            preserveQuery: payload.preserveQuery,
            enabled: payload.enabled,
            updatedBy: user._id,
          },
          { actorId: user._id, reason: 'slug change redirect' },
        )
      : await db.create(Redirect, payload, { actorId: user._id })

    results.push({
      _id: redirect._id,
      enabled: Boolean(redirect.enabled),
      from: change.from,
      to: change.to,
    })

    if (!enabled) {
      await notifyRedirectEnableRequested({
        redirectId: redirect._id,
        authorId: user._id,
        sourceContentType,
        sourceDocumentId,
        change,
      })
    }
  }

  return results
}
