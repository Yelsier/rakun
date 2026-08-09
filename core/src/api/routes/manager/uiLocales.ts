import { getRakunBootstrapOptions } from '../../../bootstrapState'
import { SeoSettings } from '../../../internal-content-types'
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

const getManagerSiteUrl = async () => {
  const db = await getMongoService()
  const settings = await db.find(SeoSettings, { key: 'default' })
  return resolveManagerSiteUrl(settings?.siteUrl)
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

export const uiLocalesHandler = async (): Promise<ManagerUiLocalesOutput> => {
  const options = getRakunBootstrapOptions()
  const siteUrl = await getManagerSiteUrl()
  const locales = (options?.managerLanguages ?? []).map((locale) => ({
    code: locale.code,
    name: locale.name,
    messages: { ...locale.messages },
  }))

  return {
    locales,
    siteUrl,
    features: resolveManagerUiFeatures(options ?? undefined),
  }
}
