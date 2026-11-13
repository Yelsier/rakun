import type { ComponentType } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { PageInfoProvider } from '@rakun-kit/react'

import { RakunPathnameProvider } from '../browser'
import { registerRakunClientRoot } from './events'

type PagePayload = {
  info?: Record<string, unknown>
  literals?: Record<string, string>
  modules: Record<string, unknown>[]
}

const pagePayloads = new WeakMap<HTMLScriptElement, PagePayload>()

const getPagePayload = (): PagePayload | undefined => {
  const script = document.querySelector<HTMLScriptElement>('#rakun-root script[data-rakun-page]')
  if (!script?.textContent) return undefined
  let payload = pagePayloads.get(script)
  if (!payload) {
    payload = JSON.parse(script.textContent) as PagePayload
    pagePayloads.set(script, payload)
  }
  return payload
}

export const hydrateRakunModule = (
  name: string,
  Component: ComponentType<Record<string, unknown>>
): void => {
  const page = getPagePayload()
  if (!page) return
  for (const element of document.querySelectorAll<HTMLElement>('[data-rakun-client]')) {
    if (
      element.dataset.rakunClient !== name ||
      element.dataset.rakunHydrated === 'true' ||
      element.dataset.rakunClientIndex === undefined
    ) {
      continue
    }

    const props = page.modules[Number(element.dataset.rakunClientIndex)]
    if (!props) continue
    element.dataset.rakunHydrated = 'true'
    const root = hydrateRoot(
      element,
      <RakunPathnameProvider pathname={window.location.pathname}>
        <PageInfoProvider value={page.info} literals={page.literals} serialize={false}>
          <Component {...props} />
        </PageInfoProvider>
      </RakunPathnameProvider>,
      {
        identifierPrefix: element.dataset.rakunIdentifierPrefix,
      }
    )
    registerRakunClientRoot(root)
  }
}
