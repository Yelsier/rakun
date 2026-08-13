const encodeMediaPath = (value: string): string =>
  value
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/')

const joinUrlPath = (baseUrl: string | null | undefined, pathname: string) => {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`

  if (!baseUrl) return normalizedPath

  return `${baseUrl.replace(/\/$/, '')}${normalizedPath}`
}

export const resolvePublicMediaUrl = ({
  key,
  access,
  mediaBaseUrl,
  mediaPublicPath,
}: {
  key?: string | null
  access?: string | null
  mediaBaseUrl?: string | null
  mediaPublicPath: string
}): string | undefined => {
  if (!key || access === 'private') return undefined

  const publicKey = key.startsWith('public/') ? key.slice('public/'.length) : key
  const encodedKey = encodeMediaPath(publicKey)

  if (!encodedKey) return undefined

  return joinUrlPath(mediaBaseUrl, `${mediaPublicPath}/${encodedKey}`)
}
