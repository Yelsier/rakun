'use client'

import {
  createContext,
  useContext,
  type AnchorHTMLAttributes,
  type ComponentType,
  type MouseEvent,
  type ReactNode,
  startTransition,
} from 'react'

import { useOptionalManagerNavigation } from './state/navigation'

export type ManagerLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
  children?: ReactNode
}

export type ManagerLinkComponent = ComponentType<ManagerLinkProps>

const ManagerLinkContext = createContext<ManagerLinkComponent | null>(null)

export function ManagerLinkProvider({
  children,
  component,
}: {
  children: ReactNode
  component?: ManagerLinkComponent
}) {
  return (
    <ManagerLinkContext.Provider value={component ?? null}>
      {children}
    </ManagerLinkContext.Provider>
  )
}

export function ManagerLink({ children, ...props }: ManagerLinkProps) {
  const LinkComponent = useContext(ManagerLinkContext)
  const navigation = useOptionalManagerNavigation()
  const href = navigation?.hrefPath?.(props.href) ?? props.href

  if (LinkComponent) {
    return (
      <LinkComponent {...props} href={href}>
        {children}
      </LinkComponent>
    )
  }

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    props.onClick?.(event)

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      props.target ||
      props.download ||
      !navigation?.pushPath ||
      href.startsWith('#')
    ) {
      return
    }

    const url = new URL(href, window.location.href)

    if (url.origin !== window.location.origin) {
      return
    }

    event.preventDefault()
    startTransition(() => {
      navigation.pushPath(`${url.pathname}${url.search}${url.hash}`)
    })
  }

  return (
    <a {...props} href={href} onClick={handleClick}>
      {children}
    </a>
  )
}
