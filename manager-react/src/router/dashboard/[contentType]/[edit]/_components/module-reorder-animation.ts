const DEFAULT_DURATION_MS = 220
const DEFAULT_EASING = 'cubic-bezier(0.2, 0, 0, 1)'

export const capturePositions = (
  elements: Iterable<HTMLElement>,
  getKey: (element: HTMLElement) => string | undefined,
): Map<string, DOMRect> => {
  const positions = new Map<string, DOMRect>()

  for (const element of elements) {
    const key = getKey(element)
    if (!key) continue
    positions.set(key, element.getBoundingClientRect())
  }

  return positions
}

export const playFlip = (
  first: Map<string, DOMRect>,
  elements: Iterable<HTMLElement>,
  getKey: (element: HTMLElement) => string | undefined,
  options?: { durationMs?: number; easing?: string },
) => {
  if (first.size === 0) return

  const durationMs = options?.durationMs ?? DEFAULT_DURATION_MS
  const easing = options?.easing ?? DEFAULT_EASING

  for (const el of elements) {
    if (typeof el.animate !== 'function') return

    const key = getKey(el)
    if (!key) continue

    const origin = first.get(key)
    if (!origin) continue

    const last = el.getBoundingClientRect()
    const dx = origin.left - last.left
    const dy = origin.top - last.top

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue

    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: 'translate(0, 0)' },
      ],
      {
        duration: durationMs,
        easing,
        fill: 'backwards',
      },
    )
  }
}

export const captureModuleCardPositions = (root: ParentNode = document) =>
  capturePositions(
    root.querySelectorAll<HTMLElement>('[data-rakun-manager-module-item]'),
    (element) => element.dataset.rakunManagerListItemUid,
  )

export const playModuleCardFlip = (
  first: Map<string, DOMRect>,
  root: ParentNode = document,
) =>
  playFlip(
    first,
    root.querySelectorAll<HTMLElement>('[data-rakun-manager-module-item]'),
    (element) => element.dataset.rakunManagerListItemUid,
  )

export const captureModuleNavPositions = (root: ParentNode = document) =>
  capturePositions(
    root.querySelectorAll<HTMLElement>('[data-rakun-manager-module-nav-item]'),
    (element) => element.dataset.rakunManagerModuleNavItem,
  )

export const playModuleNavFlip = (
  first: Map<string, DOMRect>,
  root: ParentNode = document,
) =>
  playFlip(
    first,
    root.querySelectorAll<HTMLElement>('[data-rakun-manager-module-nav-item]'),
    (element) => element.dataset.rakunManagerModuleNavItem,
  )
