import { managerMessages } from '../i18n/catalog'

export const MANAGER_SEO_TITLE_KEY = 'seo.title' as const
export const MANAGER_SEO_DESCRIPTION_KEY = 'seo.description' as const

export type ManagerSeoMessageKey =
  | typeof MANAGER_SEO_TITLE_KEY
  | typeof MANAGER_SEO_DESCRIPTION_KEY

/** Any message map that may include the SEO keys (e.g. a locale pack). */
export type ManagerSeoMessages = {
  readonly [key: string]: string | undefined
}

export const MANAGER_SEO_DEFAULTS = {
  title: managerMessages[MANAGER_SEO_TITLE_KEY].defaultMessage,
  description: managerMessages[MANAGER_SEO_DESCRIPTION_KEY].defaultMessage,
  robots: 'noindex, nofollow',
} as const

/** Resolve manager SEO copy from a locale message map (server-safe). */
export const resolveManagerSeoCopy = (messages?: ManagerSeoMessages) => ({
  title: messages?.[MANAGER_SEO_TITLE_KEY] ?? MANAGER_SEO_DEFAULTS.title,
  description:
    messages?.[MANAGER_SEO_DESCRIPTION_KEY] ?? MANAGER_SEO_DEFAULTS.description,
  robots: MANAGER_SEO_DEFAULTS.robots,
})
