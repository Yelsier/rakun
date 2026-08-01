const DEFAULT_DURATION_MS = 220
const DEFAULT_EASING = 'cubic-bezier(0.2, 0, 0, 1)'

export const MODULE_REORDER_FLIP_MS = DEFAULT_DURATION_MS

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
    if (typeof el.animate !== 'function') continue

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

const escapeCssValue = (value: string) =>
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(value)
    : value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

const moduleCardSelector = (fieldId?: string) =>
  fieldId
    ? `[data-rakun-manager-list-field-id="${escapeCssValue(fieldId)}"][data-rakun-manager-module-item]`
    : '[data-rakun-manager-module-item]'

export const captureModuleCardPositions = (
  root: ParentNode = document,
  fieldId?: string,
) =>
  capturePositions(
    root.querySelectorAll<HTMLElement>(moduleCardSelector(fieldId)),
    (element) => element.dataset.rakunManagerListItemUid,
  )

export const playModuleCardFlip = (
  first: Map<string, DOMRect>,
  root: ParentNode = document,
  fieldId?: string,
) =>
  playFlip(
    first,
    root.querySelectorAll<HTMLElement>(moduleCardSelector(fieldId)),
    (element) => element.dataset.rakunManagerListItemUid,
  )

/** Reorder module card DOM nodes in place (no React). Returns the parent if moved. */
export const reorderModuleCardElements = (
  fieldId: string,
  orderedUids: readonly string[],
) => {
  const nodes = orderedUids
    .map((uid) =>
      document.querySelector<HTMLElement>(
        `[data-rakun-manager-list-field-id="${escapeCssValue(fieldId)}"][data-rakun-manager-list-item-uid="${escapeCssValue(uid)}"]`,
      ),
    )
    .filter((node): node is HTMLElement => Boolean(node))

  if (nodes.length !== orderedUids.length) return null

  const parent = nodes[0]?.parentElement
  if (!parent) return null

  for (const node of nodes) {
    parent.appendChild(node)
  }

  nodes.forEach((node, index) => {
    node.dataset.rakunManagerModuleIndex = String(index)
  })

  return parent
}

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

/** Reorder module nav sibling `<li>` nodes in place (no React). */
export const reorderModuleNavElements = (orderedUids: readonly string[]) => {
  const nodes = orderedUids
    .map((uid) =>
      document.querySelector<HTMLElement>(
        `[data-rakun-manager-module-nav-item="${escapeCssValue(uid)}"]`,
      ),
    )
    .filter((node): node is HTMLElement => Boolean(node))

  if (nodes.length !== orderedUids.length) return null

  const parent = nodes[0]?.parentElement
  if (!parent) return null
  if (nodes.some((node) => node.parentElement !== parent)) return null

  for (const node of nodes) {
    parent.appendChild(node)
  }

  return parent
}
