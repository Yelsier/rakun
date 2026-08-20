import { getRakunBootstrapOptions } from '../../../bootstrapState'
import { RouteSettings, SeoSettings } from '../../../internal-content-types'
import { LOCALE_VARIANT_GROUP_FIELD } from '../../../lib/localeVariants'
import { getContentTypeByName } from '../../../lib/Registry'
import { getMongoService } from '../../../orm'
import type { ManagerUiLocalesOutput } from '../../../schemas/manager/uiLocales'

export const resolveManagerSiteUrl = (siteUrl: unknown) => {
  const value = typeof siteUrl === 'string' ? siteUrl.trim() : ''
  if (!value) return undefined

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : undefined
  } catch {
    return undefined
  }
}

export const resolveManagerHomePageGroupId = (
  homePage: unknown,
  document?: Record<string, unknown> | null,
) => {
  const relation =
    homePage && typeof homePage === 'object'
      ? (homePage as Record<string, unknown>)
      : null
  const homePageId = typeof relation?._id === 'string' ? relation._id : undefined
  const groupId = document?.[LOCALE_VARIANT_GROUP_FIELD]

  return typeof groupId === 'string' && groupId ? groupId : homePageId
}

const getManagerPublicConfig = async () => {
  const db = await getMongoService()
  const [routeSettings, seoSettings] = await Promise.all([
    db.find(RouteSettings, { key: 'default' }),
    db.find(SeoSettings, { key: 'default' }),
  ])
  const homePage = routeSettings?.homePage as
    | { _id?: unknown; contentType?: unknown }
    | undefined
  const homePageId = resolveManagerHomePageGroupId(homePage)
  const homeContentType = getContentTypeByName(
    typeof homePage?.contentType === 'string' ? homePage.contentType : 'Page',
  )
  let homePageDocument: Record<string, unknown> | null = null

  if (homePageId && homeContentType) {
    try {
      homePageDocument = (await db.get(homeContentType, homePageId)) as
        | Record<string, unknown>
        | null
    } catch {
      // Keep the configured id if the referenced document is unavailable.
    }
  }

  return {
    homePageGroupId: resolveManagerHomePageGroupId(homePage, homePageDocument),
    siteUrl: resolveManagerSiteUrl(seoSettings?.siteUrl),
  }
}

export const resolveManagerUiFeatures = (options?: {
  mail?: unknown
  accountRecovery?: {
    passwordReset?: unknown
  }
  login?: {
    password?: boolean
    adapters?: readonly {
      id: string
      label: string
      icon?: 'github' | 'google' | 'microsoft' | 'generic'
    }[]
  }
}): ManagerUiLocalesOutput['features'] => ({
  passwordRecovery: Boolean(options?.mail && options.accountRecovery?.passwordReset),
  login: {
    password: options?.login?.password !== false,
    adapters: (options?.login?.adapters ?? []).map((adapter) => ({
      id: adapter.id,
      label: adapter.label,
      icon: adapter.icon ?? 'generic',
    })),
  },
})

export const resolveManagerRealtimeMetadata = (
  options?: ReturnType<typeof getRakunBootstrapOptions>,
): ManagerUiLocalesOutput['platform']['realtime'] => {
  const metadata = options?.platform?.realtime.metadata

  if (!metadata) return { transport: 'polling', intervalMs: 3_000 }

  return metadata.transport === 'polling'
    ? { transport: 'polling', intervalMs: metadata.intervalMs }
    : { transport: metadata.transport, endpoint: metadata.endpoint }
}

export const uiLocalesHandler = async (): Promise<ManagerUiLocalesOutput> => {
  const options = getRakunBootstrapOptions()
  const { homePageGroupId, siteUrl } = await getManagerPublicConfig()
  const locales = (options?.managerLanguages ?? []).map((locale) => ({
    code: locale.code,
    name: locale.name,
    messages: { ...locale.messages },
  }))

  return {
    locales,
    homePageGroupId,
    siteUrl,
    platform: {
      realtime: resolveManagerRealtimeMetadata(options),
    },
    features: resolveManagerUiFeatures(options ?? undefined),
  }
}
