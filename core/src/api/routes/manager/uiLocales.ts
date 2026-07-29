import { getRakunBootstrapOptions } from '../../../bootstrapState'
import type { ManagerUiLocalesOutput } from '../../../schemas/manager/uiLocales'

export const uiLocalesHandler = async (): Promise<ManagerUiLocalesOutput> => {
  const options = getRakunBootstrapOptions()
  const locales = (options?.managerLanguages ?? []).map((locale) => ({
    code: locale.code,
    name: locale.name,
    messages: { ...locale.messages },
  }))

  return { locales }
}
