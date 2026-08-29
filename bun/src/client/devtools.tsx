import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { RakunDevToolbar } from '@rakun-kit/react/devtools'

import type { RakunBunDevtoolsModule, RakunBunDevtoolsPayload } from '../types'

const UPDATE_EVENT = 'rakun:devtools:update'
const START_PREFIX = 'rakun-module-start:'
const END_MARKER = 'rakun-module-end'
const ROOT_ID = 'rakun-devtools-root'

let root: Root | undefined

const setOptionalAttribute = (
  element: Element,
  name: string,
  value: string | number | undefined
): void => {
  if (value === undefined) element.removeAttribute(name)
  else element.setAttribute(name, String(value))
}

const applyModuleAttributes = (element: Element, entry: RakunBunDevtoolsModule): void => {
  element.setAttribute('data-rakun-module', '')
  element.setAttribute('data-rakun-entry-type', entry.entryType)
  element.setAttribute('data-rakun-index', String(entry.index))
  element.setAttribute('data-rakun-layout-index', String(entry.layoutIndex))
  element.setAttribute('data-rakun-module-id', entry.module._id)
  element.setAttribute('data-rakun-module-type', entry.module._type)
  setOptionalAttribute(element, 'data-rakun-layout-key', entry.layoutKey)
  setOptionalAttribute(element, 'data-rakun-module-index', entry.moduleIndex)
}

export const instrumentRakunBunModuleRoots = (
  modules: RakunBunDevtoolsModule[],
  parent: ParentNode = document
): void => {
  const modulesByIndex = new Map(modules.map((entry) => [entry.index, entry]))
  const walker = document.createTreeWalker(parent, NodeFilter.SHOW_COMMENT)
  let comment = walker.nextNode()

  while (comment) {
    if (comment.nodeValue?.startsWith(START_PREFIX)) {
      const index = Number(comment.nodeValue.slice(START_PREFIX.length))
      const entry = Number.isFinite(index) ? modulesByIndex.get(index) : undefined
      let sibling = comment.nextSibling

      while (entry && sibling && sibling.nodeValue !== END_MARKER) {
        if (sibling instanceof Element) applyModuleAttributes(sibling, entry)
        sibling = sibling.nextSibling
      }
    }
    comment = walker.nextNode()
  }
}

const getContainer = (): HTMLElement => {
  const existing = document.querySelector<HTMLElement>(`#${ROOT_ID}`)
  if (existing) return existing

  const container = document.createElement('div')
  container.id = ROOT_ID
  document.body.append(container)
  return container
}

const updateDevtools = (payload?: RakunBunDevtoolsPayload): void => {
  if (!payload) {
    root?.unmount()
    root = undefined
    document.querySelector(`#${ROOT_ID}`)?.remove()
    return
  }

  instrumentRakunBunModuleRoots(payload.modules, document.querySelector('#rakun-root') ?? document)
  root ??= createRoot(getContainer())
  root.render(
    createElement(RakunDevToolbar, {
      key: payload.path,
      modules: payload.modules,
      renderMode: payload.renderMode,
      language: payload.language,
      documentType: payload.documentType,
      documentId: payload.documentId,
      editHref: payload.editHref,
    })
  )
}

addEventListener(UPDATE_EVENT, (event) => {
  updateDevtools((event as CustomEvent<RakunBunDevtoolsPayload | undefined>).detail)
})

const initial = document.querySelector<HTMLScriptElement>('script[data-rakun-devtools]')
if (initial?.textContent) {
  updateDevtools(JSON.parse(initial.textContent) as RakunBunDevtoolsPayload)
}
