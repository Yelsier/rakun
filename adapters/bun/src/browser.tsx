import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'

import { subscribeRakunPathname } from './client/events'

export { Link } from './link'
export type { BunLinkProps } from './link'

const PathnameContext = createContext('/')

export const RakunPathnameProvider = ({
  children,
  pathname,
}: {
  children: ReactNode
  pathname: string
}) => <PathnameContext.Provider value={pathname}>{children}</PathnameContext.Provider>

const getBrowserPathname = (): string => window.location.pathname

/** Returns the current pathname and updates after Rakun client navigation. */
export const usePathname = (): string => {
  const serverPathname = useContext(PathnameContext)
  return useSyncExternalStore(subscribeRakunPathname, getBrowserPathname, () => serverPathname)
}
