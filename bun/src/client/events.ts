type RakunClientRoot = {
  unmount(): void
}

declare global {
  interface Window {
    __RAKUN_CLIENT_ROOTS__?: Set<RakunClientRoot>
  }
}

const PATHNAME_CHANGE_EVENT = 'rakun:pathname-change'

export const subscribeRakunPathname = (listener: () => void): (() => void) => {
  addEventListener(PATHNAME_CHANGE_EVENT, listener)
  return () => removeEventListener(PATHNAME_CHANGE_EVENT, listener)
}

export const dispatchRakunPathnameChange = (): void => {
  dispatchEvent(new Event(PATHNAME_CHANGE_EVENT))
}

export const registerRakunClientRoot = (root: RakunClientRoot): void => {
  const roots = (window.__RAKUN_CLIENT_ROOTS__ ??= new Set())
  roots.add(root)
}

export const unmountRakunClientRoots = (): void => {
  const roots = window.__RAKUN_CLIENT_ROOTS__
  if (!roots) return
  for (const root of roots) root.unmount()
  roots.clear()
}
