import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { ManagerBrowserApp } from '@rakun-kit/manager-react/app/runtime-app'
import { createHttpManagerClient } from '@rakun-kit/manager-react/client/http'
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
      pathname={url.pathname}
      preview={preview}
      realtimeBaseUrl={__RAKUN_API_BASE_PATH__}
      searchParams={url.searchParams}
    />
  )
}

const root = document.querySelector('#rakun-manager-root')
if (root) createRoot(root).render(<ManagerApp />)
