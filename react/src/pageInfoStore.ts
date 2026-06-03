export type PageInfo = Record<string, unknown> | undefined

type AsyncLocalStorage<T> = {
  getStore: () => T | undefined
  run: <R>(store: T, callback: () => R) => R
}

type AsyncHooksModule = {
  AsyncLocalStorage: new <T>() => AsyncLocalStorage<T>
}

type NodeRequire = (id: string) => unknown

let currentServerPageInfo: PageInfo
let asyncLocalStore: AsyncLocalStorage<PageInfo> | null | undefined
const pageInfoTemplateSelector = 'template[data-rakun-page-info]'

type BrowserWindow = Window & {
  __CMS_PAGE_INFO__?: Record<string, unknown>
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

const getAsyncLocalStore = (): AsyncLocalStorage<PageInfo> | null => {
  if (asyncLocalStore !== undefined) return asyncLocalStore
  if (typeof window !== 'undefined') {
    asyncLocalStore = null
    return asyncLocalStore
  }

  const asyncHooksModule = getAsyncHooksModule()
  asyncLocalStore = asyncHooksModule
    ? new asyncHooksModule.AsyncLocalStorage<PageInfo>()
    : null

  return asyncLocalStore
}

const runWithFallbackPageInfo = <T>(info: PageInfo, fn: () => T): T => {
  const previous = currentServerPageInfo
  currentServerPageInfo = info

  try {
    const result = fn()

    if (isPromiseLike(result)) {
      return Promise.resolve(result).finally(() => {
        currentServerPageInfo = previous
      }) as T
    }

    currentServerPageInfo = previous
    return result
  } catch (error) {
    currentServerPageInfo = previous
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

export const runWithPageInfo = <T>(info: PageInfo, fn: () => T): T => {
  if (typeof window !== 'undefined') {
    const browserWindow = window as BrowserWindow
    browserWindow.__CMS_PAGE_INFO__ = info
    return fn()
  }

  const store = getAsyncLocalStore()

  if (store) {
    return store.run(info, fn)
  }

  return runWithFallbackPageInfo(info, fn)
}

export const setCurrentPageInfo = (info: PageInfo): void => {
  if (typeof window !== 'undefined') {
    ;(window as BrowserWindow).__CMS_PAGE_INFO__ = info
    return
  }

  currentServerPageInfo = info
}

export const getCurrentPageInfo = (): PageInfo => {
  if (typeof window !== 'undefined') {
    return (
      (window as BrowserWindow).__CMS_PAGE_INFO__ ??
      getTemplatePageInfo() ??
      currentServerPageInfo
    )
  }

  return getAsyncLocalStore()?.getStore() ?? currentServerPageInfo
}
