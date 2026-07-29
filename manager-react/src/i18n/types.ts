import type { managerMessages, ManagerMessageKey, ManagerMessageParamSpec } from './catalog'

type ParamSpecToType<T extends ManagerMessageParamSpec> = T extends 'number'
  ? number
  : T extends 'boolean'
    ? boolean
    : T extends readonly (infer U)[]
      ? U
      : string

type ParamsFromSpec<T extends Record<string, ManagerMessageParamSpec> | undefined> =
  T extends Record<string, ManagerMessageParamSpec>
    ? { [P in keyof T]: ParamSpecToType<T[P]> }
    : undefined

export type ManagerMessageValuesByKey = {
  [K in ManagerMessageKey]: (typeof managerMessages)[K] extends {
    params: infer P extends Record<string, ManagerMessageParamSpec>
  }
    ? ParamsFromSpec<P>
    : undefined
}

export type ManagerLocaleMessages = Record<ManagerMessageKey, string> &
  Record<string, string>

export type ManagerLocalePack = {
  code: string
  name: string
  /** Complete built-in ICU messages plus optional project-defined keys. */
  messages: ManagerLocaleMessages
}

export type ManagerLocaleInputPack = {
  code: string
  name: string
  /** Partial built-in messages and project-defined keys merged at runtime. */
  messages: Record<string, string>
}

export type ManagerLocaleOption = {
  code: string
  name: string
}

export type TranslationValues = Record<string, string | number | boolean | null | undefined>
