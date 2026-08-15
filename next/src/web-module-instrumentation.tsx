'use client'

import { useEffect, type ReactNode } from 'react'

export type RakunModuleInstrumentationMeta = {
  entryType: 'content' | 'layout' | 'template'
  index: number
  layoutIndex: number
  layoutKey?: string
  moduleId: string
  moduleIndex?: number
  moduleType: string
}

type ReactFiber = {
  return: ReactFiber | null
  memoizedProps?: unknown
}

type BoundaryProps = {
  __rakunModuleBoundary: true
  meta: RakunModuleInstrumentationMeta
  children: ReactNode
}

// React DOM exposes the owning host fiber on DOM nodes. Keep this private API
// confined to development instrumentation so public module contracts stay clean.
const fiberPrefix = '__reactFiber$'
const attributeNames = [
  'data-rakun-module',
  'data-rakun-entry-type',
  'data-rakun-index',
  'data-rakun-layout-index',
  'data-rakun-layout-key',
  'data-rakun-module-id',
  'data-rakun-module-index',
  'data-rakun-module-type',
] as const

let observer: MutationObserver | null = null
let animationFrame: number | null = null
let boundaryCount = 0

const isInstrumentationMeta = (value: unknown): value is RakunModuleInstrumentationMeta => {
  if (!value || typeof value !== 'object') return false

  const meta = value as Partial<RakunModuleInstrumentationMeta>
  return (
    typeof meta.index === 'number' &&
    typeof meta.layoutIndex === 'number' &&
    typeof meta.moduleId === 'string' &&
    typeof meta.moduleType === 'string' &&
    (meta.entryType === 'content' || meta.entryType === 'layout' || meta.entryType === 'template')
  )
}

const getElementFiber = (element: Element): ReactFiber | null => {
  const key = Object.keys(element).find((name) => name.startsWith(fiberPrefix))
  if (!key) return null

  return (element as unknown as Record<string, ReactFiber | undefined>)[key] ?? null
}

export const getRakunModuleMetaFromFiber = (
  fiber: ReactFiber | null
): RakunModuleInstrumentationMeta | null => {
  let current = fiber

  while (current) {
    const props = current.memoizedProps as Partial<BoundaryProps> | undefined
    if (props?.__rakunModuleBoundary === true && isInstrumentationMeta(props.meta)) {
      return props.meta
    }

    current = current.return
  }

  return null
}

const getElementMeta = (element: Element | null) =>
  element ? getRakunModuleMetaFromFiber(getElementFiber(element)) : null

const isSameModule = (
  left: RakunModuleInstrumentationMeta | null,
  right: RakunModuleInstrumentationMeta | null
) => !!left && !!right && left.index === right.index && left.moduleId === right.moduleId

const setOptionalAttribute = (
  element: Element,
  name: string,
  value: string | number | undefined
) => {
  if (value === undefined) element.removeAttribute(name)
  else element.setAttribute(name, String(value))
}

const applyModuleAttributes = (element: Element, meta: RakunModuleInstrumentationMeta) => {
  element.setAttribute('data-rakun-module', '')
  element.setAttribute('data-rakun-entry-type', meta.entryType)
  element.setAttribute('data-rakun-index', String(meta.index))
  element.setAttribute('data-rakun-layout-index', String(meta.layoutIndex))
  setOptionalAttribute(element, 'data-rakun-layout-key', meta.layoutKey)
  element.setAttribute('data-rakun-module-id', meta.moduleId)
  setOptionalAttribute(element, 'data-rakun-module-index', meta.moduleIndex)
  element.setAttribute('data-rakun-module-type', meta.moduleType)
}

const removeModuleAttributes = (element: Element) => {
  for (const name of attributeNames) element.removeAttribute(name)
}

export const instrumentRakunModuleRoots = (root: ParentNode = document) => {
  const nextRoots = new Set<Element>()

  for (const element of root.querySelectorAll('*')) {
    const meta = getElementMeta(element)
    if (!meta || isSameModule(meta, getElementMeta(element.parentElement))) {
      continue
    }

    applyModuleAttributes(element, meta)
    nextRoots.add(element)
  }

  for (const element of root.querySelectorAll('[data-rakun-module]')) {
    if (!nextRoots.has(element)) removeModuleAttributes(element)
  }
}

const scheduleInstrumentation = () => {
  if (animationFrame !== null) return

  animationFrame = window.requestAnimationFrame(() => {
    animationFrame = null
    instrumentRakunModuleRoots()
  })
}

const connectInstrumentation = () => {
  boundaryCount += 1
  scheduleInstrumentation()

  if (!observer && document.body) {
    observer = new MutationObserver(scheduleInstrumentation)
    observer.observe(document.body, { childList: true, subtree: true })
  }

  return () => {
    boundaryCount -= 1
    if (boundaryCount > 0) return

    observer?.disconnect()
    observer = null

    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }
}

export function RakunModuleInstrumentation({
  __rakunModuleBoundary: _boundary,
  meta: _meta,
  children,
}: BoundaryProps) {
  useEffect(connectInstrumentation, [])
  return children
}
