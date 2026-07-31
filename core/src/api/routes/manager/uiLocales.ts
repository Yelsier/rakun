import { getRakunBootstrapOptions } from '../../../bootstrapState'
import type { ManagerUiLocalesOutput } from '../../../schemas/manager/uiLocales'

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
  const locales = (options?.managerLanguages ?? []).map((locale) => ({
    code: locale.code,
    name: locale.name,
    messages: { ...locale.messages },
  }))

  return {
    locales,
    features: resolveManagerUiFeatures(options ?? undefined),
  }
}
