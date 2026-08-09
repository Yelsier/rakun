import { ensureRakunBootstrap, rakunBootstrap, type RakunBootstrapOptions } from '@rakun-kit/core'

let lastBootstrapSignature: string | null = null

const getContentTypeSignature = (ct: {
  name: string
  fields: Record<string, { meta?: { ui?: string } }>
}) => {
  const fields = Object.entries(ct.fields)
    .map(([key, field]) => `${key}:${field.meta?.ui ?? '?'}`)
    .sort()
    .join(',')
  return `${ct.name}[${fields}]`
}

const getBootstrapSignature = (options: RakunBootstrapOptions): string => {
  const contentTypes = options.contentTypes
    .map((ct) => getContentTypeSignature(ct))
    .sort()
    .join('|')

  const routes = (options.routes ?? [])
    .map((route) => `${route.key}:${route.contentType}:${String(route.field)}`)
    .join('|')

  const internals = Object.entries(options.internalContentTypes ?? {})
    .map(([key, ct]) => `${key}:${getContentTypeSignature(ct)}`)
    .sort()
    .join('|')

  return `${contentTypes}::${routes}::${internals}`
}

export const applyRakunBootstrap = (
  bootstrap: RakunBootstrapOptions | (() => RakunBootstrapOptions)
) => {
  if (typeof bootstrap !== 'function') {
    ensureRakunBootstrap(bootstrap)
    return
  }

  const options = bootstrap()
  const signature = getBootstrapSignature(options)

  if (lastBootstrapSignature === signature) {
    return
  }

  rakunBootstrap(options)
  lastBootstrapSignature = signature
}
