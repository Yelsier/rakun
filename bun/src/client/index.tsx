import type { ComponentType } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { PageInfoProvider } from '@rakun-kit/react'

import { RakunPathnameProvider } from '../browser'
import { registerRakunClientRoot } from './events'

const decodeProps = (value: string): Record<string, unknown> => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
}

const readTemplate = <T extends Record<string, unknown>>(
  element: HTMLElement,
  selector: string
): T | undefined => {
  const value = element.querySelector<HTMLTemplateElement>(selector)?.innerHTML
  if (!value || value === 'null') return undefined
  return JSON.parse(value) as T
}

export const hydrateRakunModule = (
  name: string,
  Component: ComponentType<Record<string, unknown>>
): void => {
  for (const element of document.querySelectorAll<HTMLElement>('[data-rakun-client]')) {
    if (
      element.dataset.rakunClient !== name ||
      element.dataset.rakunHydrated === 'true' ||
      !element.dataset.rakunProps
    ) {
      continue
    }

    element.dataset.rakunHydrated = 'true'
    const info = readTemplate<Record<string, unknown>>(element, 'template[data-rakun-page-info]')
    const literals = readTemplate<Record<string, string>>(
      element,
      'template[data-rakun-page-literals]'
    )
    const root = hydrateRoot(
      element,
      <RakunPathnameProvider pathname={element.dataset.rakunPathname ?? window.location.pathname}>
        <PageInfoProvider value={info} literals={literals}>
          <Component {...decodeProps(element.dataset.rakunProps)} />
        </PageInfoProvider>
      </RakunPathnameProvider>,
      {
        identifierPrefix: element.dataset.rakunIdentifierPrefix,
      }
    )
    registerRakunClientRoot(root)
  }
}
