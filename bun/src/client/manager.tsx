import {
  startTransition,
  useEffect,
  useState,
  type FocusEvent,
  type MouseEvent,
  type TouchEvent,
} from 'react'
import { createRoot } from 'react-dom/client'

import { ManagerBrowserApp } from '@rakun-kit/manager-react/app/runtime-app'
import { createHttpManagerClient } from '@rakun-kit/manager-react/client/http'
import {
  preloadManagerPath,
  type ManagerLinkProps,
  useOptionalManagerNavigation,
} from '@rakun-kit/manager-react'
import '@rakun-kit/manager-react/styles.css'

declare const __RAKUN_API_BASE_PATH__: string
declare const __RAKUN_MANAGER_BASE_PATH__: string
declare const __RAKUN_MANAGER_PREVIEW_ENABLED__: boolean
declare const __RAKUN_MANAGER_PREVIEW_TOKEN_PARAM__: string
declare const __RAKUN_MANAGER_PREVIEW_WEB_BASE_URL__: string

const client = createHttpManagerClient({ baseUrl: __RAKUN_API_BASE_PATH__ })
const preview = __RAKUN_MANAGER_PREVIEW_ENABLED__
  ? {
      tokenParam: __RAKUN_MANAGER_PREVIEW_TOKEN_PARAM__,
      webBaseUrl: __RAKUN_MANAGER_PREVIEW_WEB_BASE_URL__,
    }
  : undefined

const BunManagerLink = ({
  children,
  href,
  onClick,
  onFocus,
  onMouseEnter,
  onTouchStart,
  ...props
}: ManagerLinkProps) => {
  const navigation = useOptionalManagerNavigation()

  const prefetch = () => {
    if (props.target || props.download || href.startsWith('#')) return

    const url = new URL(href, window.location.href)
    if (url.origin !== window.location.origin) return
    preloadManagerPath(`${url.pathname}${url.search}`, {
      basePath: __RAKUN_MANAGER_BASE_PATH__,
    })
  }

  const handleMouseEnter = (event: MouseEvent<HTMLAnchorElement>) => {
    onMouseEnter?.(event)
    if (!event.defaultPrevented) prefetch()
  }

  const handleFocus = (event: FocusEvent<HTMLAnchorElement>) => {
    onFocus?.(event)
    if (!event.defaultPrevented) prefetch()
  }

  const handleTouchStart = (event: TouchEvent<HTMLAnchorElement>) => {
    onTouchStart?.(event)
    if (!event.defaultPrevented) prefetch()
  }

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    const pushPath = navigation?.pushPath

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      props.target ||
      props.download ||
      !pushPath ||
      href.startsWith('#')
    ) {
      return
    }

    const url = new URL(href, window.location.href)
    if (url.origin !== window.location.origin) return

    event.preventDefault()
    startTransition(() => {
      pushPath(`${url.pathname}${url.search}${url.hash}`)
    })
  }

  return (
    <a
      {...props}
      href={href}
      onClick={handleClick}
      onFocus={handleFocus}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleTouchStart}
    >
      {children}
    </a>
  )
}

const ManagerApp = () => {
  const [current, setCurrent] = useState(() => location.pathname + location.search)

  useEffect(() => {
    const update = () => setCurrent(location.pathname + location.search)
    addEventListener('popstate', update)
    return () => removeEventListener('popstate', update)
  }, [])

  const url = new URL(current, location.origin)
  return (
    <ManagerBrowserApp
      basePath={__RAKUN_MANAGER_BASE_PATH__}
      client={client}
      linkComponent={BunManagerLink}
      pathname={url.pathname}
      preview={preview}
      realtimeBaseUrl={__RAKUN_API_BASE_PATH__}
      searchParams={url.searchParams}
    />
  )
}

const root = document.querySelector('#rakun-manager-root')
if (root) createRoot(root).render(<ManagerApp />)
