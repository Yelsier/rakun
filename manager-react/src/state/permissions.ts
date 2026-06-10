import {
  mapPermissions,
  type EncodedContentType,
  type ManagerUserSchema,
  type Permission,
} from '@rakun-kit/core/client'

type ContentPermissionAction = 'own' | 'readAny' | 'updateAny' | 'deleteAny'

const contentPermissionActions: ContentPermissionAction[] = [
  'readAny',
  'own',
  'updateAny',
  'deleteAny',
]

const contentPermissionPattern =
  /^content\.([^.]+)\.(own|readAny|updateAny|deleteAny)$/

const isContentPermission = (permission: Permission) =>
  contentPermissionPattern.test(permission)

const resolveContentPermission = (
  permission: Permission,
  contentTypes: EncodedContentType[]
): Permission | null => {
  const match = contentPermissionPattern.exec(permission)

  if (!match) return permission

  const contentTypeName = match[1]
  const action = match[2] as ContentPermissionAction

  if (contentTypeName === 'MediaFolder') {
    return `content.Media.${action}` as Permission
  }

  const contentType = contentTypes.find((item) => item.name === contentTypeName)

  if (!contentType) return permission

  const config = contentType.permissions

  if (config === false) return null

  if (typeof config === 'string') {
    return `content.${config}.${action}` as Permission
  }

  if (config && typeof config === 'object') {
    const resource =
      'resource' in config && typeof config.resource === 'string'
        ? config.resource
        : contentType.name
    const actions =
      'actions' in config &&
      Array.isArray(config.actions) &&
      config.actions.length > 0
        ? config.actions
        : contentPermissionActions

    if (!actions.includes(action)) return null

    return `content.${resource}.${action}` as Permission
  }

  if (contentType.isInternal) return null

  return `content.${contentType.name}.${action}` as Permission
}

const resolvePermissions = (
  permissions: Permission[],
  contentTypes: EncodedContentType[]
): Permission[] | null => {
  const resolved: Permission[] = []

  for (const permission of mapPermissions(permissions)) {
    const resolvedPermission = resolveContentPermission(
      permission,
      contentTypes
    )

    if (!resolvedPermission) return null

    resolved.push(resolvedPermission)
  }

  return resolved
}

const getGrantedPermissions = (
  user: ManagerUserSchema,
  contentTypes: EncodedContentType[]
) => {
  const granted = new Set<Permission>()

  for (const permission of user.role.permissions) {
    const resolved = resolvePermissions([permission as Permission], contentTypes)

    if (!resolved) continue

    for (const item of resolved) {
      granted.add(item)
    }
  }

  return granted
}

export const hasManagerPermissions = (
  user: ManagerUserSchema,
  permissions: Permission[],
  contentTypes: EncodedContentType[] = []
) => {
  const resolved = resolvePermissions(permissions, contentTypes)

  if (!resolved) return false

  const granted = getGrantedPermissions(user, contentTypes)

  return resolved.every((permission) => {
    if (isContentPermission(permission)) {
      return granted.has(permission)
    }

    return false
  })
}
