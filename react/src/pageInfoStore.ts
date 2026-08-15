export type PageInfo = Record<string, unknown> | undefined
export type PageLiterals = Record<string, string> | undefined

type PageRuntimeContext = {
  info: PageInfo
  literals: PageLiterals
}

type AsyncLocalStorage<T> = {
  getStore: () => T | undefined
  run: <R>(store: T, callback: () => R) => R
}

type AsyncHooksModule = {
  AsyncLocalStorage: new <T>() => AsyncLocalStorage<T>
}

type NodeRequire = (id: string) => unknown

let currentServerPageContext: PageRuntimeContext | undefined
let asyncLocalStore: AsyncLocalStorage<PageRuntimeContext> | null | undefined
const pageInfoTemplateSelector = 'template[data-rakun-page-info]'
const pageLiteralsTemplateSelector = 'template[data-rakun-page-literals]'

type BrowserWindow = Window & {
  __CMS_PAGE_INFO__?: Record<string, unknown>
  __CMS_PAGE_LITERALS__?: Record<string, string>
}

type GlobalWithProcess = typeof globalThis & {
  process?: {
    getBuiltinModule?: (id: string) => unknown
  }
}

const getNodeRequire = (): NodeRequire | null => {
  try {
    return Function(
      'return typeof require === "function" ? require : null',
    )() as NodeRequire | null
  } catch {
    return null
  }
}

const isPromiseLike = <T>(value: unknown): value is PromiseLike<T> =>
  !!value &&
  (typeof value === 'object' || typeof value === 'function') &&
  typeof (value as PromiseLike<T>).then === 'function'

const getAsyncHooksModule = (): AsyncHooksModule | null => {
  const builtinModule = (globalThis as GlobalWithProcess).process?.getBuiltinModule?.(
    'node:async_hooks',
  ) as AsyncHooksModule | undefined

  if (builtinModule?.AsyncLocalStorage) {
    return builtinModule
  }

  const nodeRequire = getNodeRequire()

  if (!nodeRequire) {
    return null
  }

  try {
    const requiredModule = nodeRequire('node:async_hooks') as AsyncHooksModule
    return requiredModule?.AsyncLocalStorage ? requiredModule : null
  } catch {
    return null
  }
}

const getAsyncLocalStore = (): AsyncLocalStorage<PageRuntimeContext> | null => {
  if (asyncLocalStore !== undefined) return asyncLocalStore
  if (typeof window !== 'undefined') {
    asyncLocalStore = null
    return asyncLocalStore
  }

  const asyncHooksModule = getAsyncHooksModule()
  asyncLocalStore = asyncHooksModule
    ? new asyncHooksModule.AsyncLocalStorage<PageRuntimeContext>()
    : null

  return asyncLocalStore
}

const runWithFallbackPageInfo = <T>(
  info: PageInfo,
  fn: () => T,
  literals: PageLiterals,
): T => {
  const previous = currentServerPageContext
  currentServerPageContext = { info, literals }

  try {
    const result = fn()

    if (isPromiseLike(result)) {
      return Promise.resolve(result).finally(() => {
        currentServerPageContext = previous
      }) as T
    }

    currentServerPageContext = previous
    return result
  } catch (error) {
    currentServerPageContext = previous
    throw error
  }
}

const getTemplatePageInfo = (): PageInfo => {
  if (typeof document === 'undefined') return undefined

  const template = document.querySelector<HTMLTemplateElement>(
    pageInfoTemplateSelector,
  )
  const raw =
    template?.content.textContent ?? template?.innerHTML ?? template?.textContent

  if (!raw) return undefined

  try {
    const parsed = JSON.parse(raw) as unknown

    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : undefined
  } catch {
    return undefined
  }
}

const getTemplatePageLiterals = (): PageLiterals => {
  if (typeof document === 'undefined') return undefined

  const template = document.querySelector<HTMLTemplateElement>(
    pageLiteralsTemplateSelector,
  )
  const raw =
    template?.content.textContent ?? template?.innerHTML ?? template?.textContent

  if (!raw) return undefined

  try {
    const parsed = JSON.parse(raw) as unknown

    if (!parsed || typeof parsed !== 'object') return undefined

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([, value]) => typeof value === 'string',
      ),
    ) as Record<string, string>
  } catch {
    return undefined
  }
}

export const runWithPageInfo = <T>(
  info: PageInfo,
  fn: () => T,
  literals?: PageLiterals,
): T => {
  if (typeof window !== 'undefined') {
    const browserWindow = window as BrowserWindow
    browserWindow.__CMS_PAGE_INFO__ = info
    browserWindow.__CMS_PAGE_LITERALS__ = literals
    return fn()
  }

  const store = getAsyncLocalStore()

  if (store) {
    return store.run({ info, literals }, fn)
  }

  return runWithFallbackPageInfo(info, fn, literals)
}

export const setCurrentPageInfo = (info: PageInfo): void => {
  if (typeof window !== 'undefined') {
    ;(window as BrowserWindow).__CMS_PAGE_INFO__ = info
    return
  }

  currentServerPageContext = {
    info,
    literals: currentServerPageContext?.literals,
  }
}

export const setCurrentPageLiterals = (literals: PageLiterals): void => {
  if (typeof window !== 'undefined') {
    ;(window as BrowserWindow).__CMS_PAGE_LITERALS__ = literals
    return
  }

  currentServerPageContext = {
    info: currentServerPageContext?.info,
    literals,
  }
}

export const getCurrentPageInfo = (): PageInfo => {
  if (typeof window !== 'undefined') {
    return (
      (window as BrowserWindow).__CMS_PAGE_INFO__ ??
      getTemplatePageInfo() ??
      currentServerPageContext?.info
    )
  }

  return getAsyncLocalStore()?.getStore()?.info ?? currentServerPageContext?.info
}

export const getCurrentPageLiterals = (): PageLiterals => {
  if (typeof window !== 'undefined') {
    return (
      (window as BrowserWindow).__CMS_PAGE_LITERALS__ ??
      getTemplatePageLiterals() ??
      currentServerPageContext?.literals
    )
  }

  return (
    getAsyncLocalStore()?.getStore()?.literals ??
    currentServerPageContext?.literals
  )
}
