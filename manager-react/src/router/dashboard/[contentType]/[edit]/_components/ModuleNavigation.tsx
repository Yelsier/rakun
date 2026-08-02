'use client'

import { Box, ChevronRight, GripVertical, ListTree, Plus } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTranslations } from '@/i18n'
import { cn } from '@/lib/utils'

import { dispatchModuleReorder } from './module-navigation-reorder'
import {
  MODULE_REORDER_FLIP_MS,
  captureModuleNavPositions,
  playModuleNavFlip,
  reorderModuleNavElements,
} from './module-reorder-animation'

type ModuleNavigationItem = {
  element: HTMLElement
  fieldId: string
  id: string
  title: string
  uid: string
  children: ModuleNavigationItem[]
}

type ModuleNavigationTab = 'content' | 'template'

const moduleSelector = '[data-rakun-manager-module-item]'
const ACTIVATION_DISTANCE_PX = 4

const getOrderSignature = (nodes: ModuleNavigationItem[]): string =>
  nodes.map((node) => `${node.uid}[${getOrderSignature(node.children)}]`).join(',')

/** Visible nav identity (order + labels). Used to skip no-op React updates. */
const getTreeSignature = (nodes: ModuleNavigationItem[]): string =>
  nodes
    .map(
      (node) =>
        `${node.id}\0${node.uid}\0${node.fieldId}\0${node.title}[${getTreeSignature(node.children)}]`,
    )
    .join(',')

/** Keep DOM node refs fresh without re-rendering when the tree shape is unchanged. */
const patchElementRefs = (
  current: ModuleNavigationItem[],
  next: ModuleNavigationItem[],
) => {
  for (let index = 0; index < current.length; index += 1) {
    const currentNode = current[index]
    const nextNode = next[index]
    if (!currentNode || !nextNode) return
    currentNode.element = nextNode.element
    patchElementRefs(currentNode.children, nextNode.children)
  }
}

/** Same order, possibly new titles — mutate in place and patch visible labels. */
const patchTitlesInPlace = (
  current: ModuleNavigationItem[],
  next: ModuleNavigationItem[],
) => {
  for (let index = 0; index < current.length; index += 1) {
    const currentNode = current[index]
    const nextNode = next[index]
    if (!currentNode || !nextNode) return

    currentNode.element = nextNode.element
    if (currentNode.title !== nextNode.title) {
      currentNode.title = nextNode.title
      const label = document.querySelector<HTMLElement>(
        `[data-rakun-manager-module-nav-item="${CSS.escape(currentNode.uid)}"] span.truncate`,
      )
      if (label) label.textContent = nextNode.title
    }
    patchTitlesInPlace(currentNode.children, nextNode.children)
  }
}

const buildModuleTree = (
  root: HTMLElement,
  fallbackTitle: (index: number) => string,
): ModuleNavigationItem[] => {
  const elements = Array.from(root.querySelectorAll<HTMLElement>(moduleSelector))
  const items = new Map<HTMLElement, ModuleNavigationItem>()
  const result: ModuleNavigationItem[] = []

  elements.forEach((element, index) => {
    const navigationId =
      element.dataset.rakunManagerModuleNavigationId ?? String(index)
    const uid =
      element.dataset.rakunManagerListItemUid ??
      navigationId.slice(navigationId.lastIndexOf('.') + 1)
    const fieldId =
      element.dataset.rakunManagerListFieldId ??
      navigationId.slice(0, navigationId.lastIndexOf('.'))

    items.set(element, {
      element,
      fieldId,
      id: navigationId,
      title: element.dataset.rakunManagerModuleTitle ?? fallbackTitle(index),
      uid,
      children: [],
    })
  })

  elements.forEach((element) => {
    const item = items.get(element)
    if (!item) return

    const parent = element.parentElement?.closest<HTMLElement>(moduleSelector)
    const parentItem = parent ? items.get(parent) : undefined

    if (parentItem) {
      parentItem.children.push(item)
    } else {
      result.push(item)
    }
  })

  return result
}

const revealAndScrollTo = (item: ModuleNavigationItem) => {
  const ancestors: HTMLElement[] = []
  let parent = item.element.parentElement?.closest<HTMLElement>(moduleSelector)

  while (parent) {
    ancestors.unshift(parent)
    parent = parent.parentElement?.closest<HTMLElement>(moduleSelector)
  }

  ancestors.forEach((ancestor) => {
    const trigger = ancestor.querySelector<HTMLElement>(
      ':scope [data-rakun-manager-module-trigger]',
    )

    if (trigger?.dataset.state === 'closed') {
      trigger.click()
    }
  })

  window.requestAnimationFrame(() => {
    const scrollContainer = document.querySelector<HTMLElement>(
      '[data-rakun-manager-edit-scroll-area]',
    )

    if (scrollContainer) {
      const viewportRect = scrollContainer.getBoundingClientRect()
      const itemRect = item.element.getBoundingClientRect()
      const top =
        scrollContainer.scrollTop +
        itemRect.top -
        viewportRect.top -
        (scrollContainer.clientHeight - itemRect.height) / 2

      scrollContainer.scrollTo({ top, behavior: 'smooth' })
    }

    item.element.focus({ preventScroll: true })
    item.element.classList.remove('rakun-manager-preview-selected')
    void item.element.offsetWidth
    item.element.classList.add('rakun-manager-preview-selected')

    window.setTimeout(() => {
      item.element.classList.remove('rakun-manager-preview-selected')
    }, 2200)
  })
}

const replaceSiblingBranch = (
  nodes: ModuleNavigationItem[],
  nextItems: ModuleNavigationItem[],
): ModuleNavigationItem[] => {
  if (nodes.some((node) => node.id === nextItems[0]?.id)) {
    return nextItems
  }

  return nodes.map((node) => ({
    ...node,
    children: replaceSiblingBranch(node.children, nextItems),
  }))
}

const findNavItemByUid = (
  nodes: ModuleNavigationItem[],
  uid: string,
): ModuleNavigationItem | undefined => {
  for (const node of nodes) {
    if (node.uid === uid) return node
    const nested = findNavItemByUid(node.children, uid)
    if (nested) return nested
  }
  return undefined
}

const readSiblingUids = (list: HTMLElement) =>
  Array.from(list.children)
    .map((child) =>
      child instanceof HTMLElement ? child.dataset.rakunManagerModuleNavItem : undefined,
    )
    .filter((uid): uid is string => Boolean(uid))

/**
 * Pointer/mouse reorder for one sibling list. Mutates DOM only while dragging —
 * no React state, no dnd-kit context, no Slot clones.
 */
const attachNavListReorder = (
  list: HTMLElement,
  itemsRef: { current: ModuleNavigationItem[] },
  onDrop: (nextItems: ModuleNavigationItem[]) => void,
) => {
  let activeUid: string | null = null
  let activeLi: HTMLElement | null = null
  let startY = 0
  let dragging = false
  let originUids: string[] = []
  let active = false

  const cleanupVisual = () => {
    if (activeLi) {
      activeLi.removeAttribute('data-dragging')
      activeLi.style.opacity = ''
    }
  }

  const reset = () => {
    cleanupVisual()
    activeUid = null
    activeLi = null
    dragging = false
    originUids = []
    active = false
  }

  const resolveBranch = (
    nodes: ModuleNavigationItem[],
    membership: string[],
    order: string[],
  ): ModuleNavigationItem[] | null => {
    const nodeUids = new Set(nodes.map((node) => node.uid))
    if (
      membership.length === nodes.length &&
      membership.every((uid) => nodeUids.has(uid))
    ) {
      const map = new Map(nodes.map((node) => [node.uid, node]))
      const next = order
        .map((uid) => map.get(uid))
        .filter((item): item is ModuleNavigationItem => Boolean(item))
      return next.length === order.length ? next : null
    }
    for (const node of nodes) {
      const nested = resolveBranch(node.children, membership, order)
      if (nested) return nested
    }
    return null
  }

  const finish = () => {
    if (!active) return

    const didDrag = dragging
    const nextUids = readSiblingUids(list)
    const membership = originUids
    reset()
    detachWindow()

    if (!didDrag) return

    const unchanged =
      nextUids.length === membership.length &&
      nextUids.every((value, index) => value === membership[index])
    if (unchanged) return

    const nextItems = resolveBranch(itemsRef.current, membership, nextUids)
    if (!nextItems) return

    onDrop(nextItems)
  }

  const moveTo = (clientY: number) => {
    if (!active || !activeLi || !activeUid) return

    if (!dragging) {
      if (Math.abs(clientY - startY) < ACTIVATION_DISTANCE_PX) return
      dragging = true
      activeLi.setAttribute('data-dragging', '')
      activeLi.style.opacity = '0.55'
    }

    const siblings = Array.from(list.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    )
    if (siblings.length < 2) return

    const over = siblings.find((sibling) => {
      if (sibling === activeLi) return false
      const rect = sibling.getBoundingClientRect()
      return clientY >= rect.top && clientY <= rect.bottom
    })
    if (!over) return

    const activeIndex = siblings.indexOf(activeLi)
    const overIndex = siblings.indexOf(over)
    if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return

    if (activeIndex < overIndex) {
      list.insertBefore(activeLi, over.nextSibling)
    } else {
      list.insertBefore(activeLi, over)
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    moveTo(event.clientY)
  }

  const onMouseMove = (event: MouseEvent) => {
    moveTo(event.clientY)
  }

  const onPointerUp = () => {
    finish()
  }

  const onMouseUp = () => {
    finish()
  }

  const detachWindow = () => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  const onPointerDown = (event: PointerEvent) => {
    const handle = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      '[data-rakun-manager-module-nav-handle]',
    )
    if (!handle || !list.contains(handle)) return
    if (event.button !== 0) return

    const li = handle.closest<HTMLElement>('[data-rakun-manager-module-nav-item]')
    if (!li || li.parentElement !== list) return

    const uid = li.dataset.rakunManagerModuleNavItem
    if (!uid) return

    event.preventDefault()
    active = true
    activeUid = uid
    activeLi = li
    startY = event.clientY
    dragging = false
    originUids = readSiblingUids(list)

    handle.setPointerCapture?.(event.pointerId)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  list.addEventListener('pointerdown', onPointerDown)
  return () => {
    list.removeEventListener('pointerdown', onPointerDown)
    detachWindow()
    reset()
  }
}

const ModuleNavHeader = memo(function ModuleNavHeader({ count }: { count: number }) {
  const t = useTranslations()

  return (
    <div className="flex shrink-0 items-center gap-3 px-4 pb-3" style={{ paddingTop: '1rem' }}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <ListTree className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-none">{t('modules.title')}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('modules.topLevelCount', { count })}
        </p>
      </div>
    </div>
  )
})

const ModuleNavAddButton = memo(function ModuleNavAddButton({
  tab,
}: {
  tab: ModuleNavigationTab
}) {
  const t = useTranslations()

  const openModulePicker = () => {
    const tabPanel = document.querySelector<HTMLElement>(
      `[data-rakun-manager-tab-panel="${tab}"]`,
    )
    const trigger = tabPanel?.querySelector<HTMLButtonElement>(
      '[data-rakun-manager-add-module-trigger]',
    )
    trigger?.click()
  }

  return (
    <div className="shrink-0 border-t p-3">
      <Button variant="outline" className="w-full justify-start" onClick={openModulePicker}>
        <Plus />
        {t('modules.addModule')}
      </Button>
    </div>
  )
})

/** Title / expand controls — no drag context. */
const ModuleNavRowControls = memo(function ModuleNavRowControls({
  hasChildren,
  selected,
  title,
  toggleLabel,
  uid,
  onSelectUid,
}: {
  hasChildren: boolean
  selected: boolean
  title: string
  toggleLabel: string
  uid: string
  onSelectUid: (uid: string) => void
}) {
  if (hasChildren) {
    return (
      <>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground data-[state=open]:[&_svg]:rotate-90"
            aria-label={toggleLabel}
          >
            <ChevronRight className="size-3 transition-transform" />
          </button>
        </CollapsibleTrigger>
        <button
          type="button"
          className="inline-flex h-6 min-w-0 flex-1 items-center justify-start gap-1.5 rounded-md px-1.5 text-xs font-normal hover:bg-transparent"
          onClick={() => onSelectUid(uid)}
        >
          <Box className="size-3 shrink-0 text-muted-foreground" />
          <span className="truncate">{title}</span>
        </button>
      </>
    )
  }

  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-6 min-w-0 flex-1 items-center justify-start gap-1.5 rounded-md px-1.5 text-xs font-normal text-muted-foreground hover:bg-background/80 hover:text-foreground',
        selected && 'bg-transparent text-foreground shadow-none hover:bg-transparent',
      )}
      onClick={() => onSelectUid(uid)}
    >
      <Box className="size-3 shrink-0 opacity-70" />
      <span className="truncate">{title}</span>
    </button>
  )
})

const NavigationItems = memo(function NavigationItems({
  activeId,
  items,
  itemsRef,
  onReorder,
  onSelectUid,
  reorderLabel,
  toggleLabelFor,
}: {
  activeId?: string
  items: ModuleNavigationItem[]
  itemsRef: { current: ModuleNavigationItem[] }
  onReorder: (items: ModuleNavigationItem[]) => void
  onSelectUid: (uid: string) => void
  reorderLabel: string
  toggleLabelFor: (title: string) => string
}) {
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    return attachNavListReorder(list, itemsRef, onReorder)
  }, [itemsRef, onReorder])

  if (items.length === 0) return null

  return (
    <ul ref={listRef} className="flex flex-col gap-0.5">
      {items.map((item, index) => {
        const selected = activeId === item.id
        const hasChildren = item.children.length > 0

        return (
          <li
            key={item.id}
            className="relative pl-4"
            data-rakun-manager-module-nav-item={item.uid}
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute left-1 top-0 w-px bg-border/70',
                index === items.length - 1 ? 'h-3.5' : 'h-full',
              )}
            />
            <span
              aria-hidden="true"
              className="absolute left-1 top-3.5 h-px w-2.5 bg-border/70"
            />
            {hasChildren ? (
              <Collapsible defaultOpen>
                <div
                  className={cn(
                    'group flex min-w-0 items-center rounded-md transition-colors hover:bg-background/80 px-0.5',
                    selected && 'bg-background text-foreground shadow-sm',
                  )}
                >
                  <button
                    type="button"
                    data-rakun-manager-module-nav-handle=""
                    className="inline-flex size-5 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground active:cursor-grabbing"
                    aria-label={reorderLabel}
                  >
                    <GripVertical className="size-3" />
                  </button>
                  <ModuleNavRowControls
                    hasChildren
                    selected={selected}
                    title={item.title}
                    toggleLabel={toggleLabelFor(item.title)}
                    uid={item.uid}
                    onSelectUid={onSelectUid}
                  />
                </div>
                <CollapsibleContent className="ml-4 pt-0.5">
                  <NavigationItems
                    activeId={activeId}
                    items={item.children}
                    itemsRef={itemsRef}
                    onReorder={onReorder}
                    onSelectUid={onSelectUid}
                    reorderLabel={reorderLabel}
                    toggleLabelFor={toggleLabelFor}
                  />
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <div
                className={cn(
                  'group flex min-w-0 items-center rounded-md transition-colors',
                  selected && 'bg-background text-foreground shadow-sm',
                )}
              >
                <button
                  type="button"
                  data-rakun-manager-module-nav-handle=""
                  className="inline-flex size-5 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground active:cursor-grabbing"
                  aria-label={reorderLabel}
                >
                  <GripVertical className="size-3" />
                </button>
                <ModuleNavRowControls
                  hasChildren={false}
                  selected={selected}
                  title={item.title}
                  toggleLabel=""
                  uid={item.uid}
                  onSelectUid={onSelectUid}
                />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
})

const ModuleNavList = ({ tab }: { tab: ModuleNavigationTab }) => {
  const t = useTranslations()
  const [activeId, setActiveId] = useState<string>()
  const [items, setItems] = useState<ModuleNavigationItem[]>([])
  const draggingRef = useRef(false)
  const commitTimerRef = useRef(0)
  const itemsRef = useRef(items)
  itemsRef.current = items

  const reorderLabel = t('modules.reorder')
  const toggleLabelFor = useCallback(
    (title: string) => t('modules.toggleModule', { title }),
    [t],
  )

  const selectUid = useCallback((uid: string) => {
    const item = findNavItemByUid(itemsRef.current, uid)
    if (!item) return
    setActiveId(item.id)
    revealAndScrollTo(item)
  }, [])

  const handleReorder = useCallback((nextItems: ModuleNavigationItem[]) => {
    if (nextItems.length === 0) return

    draggingRef.current = true

    const nextTree = replaceSiblingBranch(itemsRef.current, nextItems)
    itemsRef.current = nextTree

    // DOM may already match from pointer drag; keep helpers for card-side sync path.
    const first = captureModuleNavPositions()
    const moved = reorderModuleNavElements(nextItems.map((item) => item.uid))
    if (moved) playModuleNavFlip(first)

    dispatchModuleReorder({
      fieldId: nextItems[0].fieldId,
      orderedUids: nextItems.map((item) => item.uid),
    })

    window.clearTimeout(commitTimerRef.current)
    commitTimerRef.current = window.setTimeout(() => {
      setItems(itemsRef.current)
      draggingRef.current = false
    }, MODULE_REORDER_FLIP_MS)
  }, [])

  useEffect(() => {
    const tabPanel = document.querySelector<HTMLElement>(
      `[data-rakun-manager-tab-panel="${tab}"]`,
    )
    if (!tabPanel) return

    let scheduled = false
    let cancelled = false

    const applyTree = (next: ModuleNavigationItem[]) => {
      const current = itemsRef.current
      if (getTreeSignature(current) === getTreeSignature(next)) {
        patchElementRefs(current, next)
        return
      }

      const orderChanged = getOrderSignature(current) !== getOrderSignature(next)

      // Same order, labels changed — mutate refs/DOM text, skip React.
      if (!orderChanged) {
        patchTitlesInPlace(current, next)
        return
      }

      // Order changed from the content panel (card-side drag). Animate after
      // committing once — no flushSync.
      const first = captureModuleNavPositions()
      itemsRef.current = next
      setItems(next)
      requestAnimationFrame(() => {
        playModuleNavFlip(first)
      })
    }

    const update = () => {
      if (draggingRef.current || scheduled || cancelled) return
      scheduled = true

      queueMicrotask(() => {
        scheduled = false
        if (draggingRef.current || cancelled) return

        applyTree(
          buildModuleTree(tabPanel, (index) =>
            t('modules.fallbackTitleNumbered', { number: index + 1 }),
          ),
        )
      })
    }
    const observer = new MutationObserver(update)

    observer.observe(tabPanel, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'data-rakun-manager-module-title',
        'data-rakun-manager-module-navigation-id',
        'data-rakun-manager-list-field-id',
        'data-rakun-manager-list-item-uid',
      ],
    })
    update()

    return () => {
      cancelled = true
      window.clearTimeout(commitTimerRef.current)
      observer.disconnect()
    }
  }, [t, tab])

  return (
    <>
      <ModuleNavHeader count={items.length} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-2 pb-3" style={{ paddingTop: '0.75rem' }}>
          {items.length > 0 ? (
            <NavigationItems
              activeId={activeId}
              items={items}
              itemsRef={itemsRef}
              onReorder={handleReorder}
              onSelectUid={selectUid}
              reorderLabel={reorderLabel}
              toggleLabelFor={toggleLabelFor}
            />
          ) : (
            <p className="px-2 text-xs text-muted-foreground">{t('modules.empty')}</p>
          )}
        </div>
      </ScrollArea>
      <ModuleNavAddButton tab={tab} />
    </>
  )
}

export const ModuleNavigation = ({ tab }: { tab: ModuleNavigationTab }) => {
  const t = useTranslations()

  return (
    <aside
      className="sticky top-4 hidden h-full w-60 shrink-0 self-start overflow-hidden rounded-xl bg-muted/40 lg:block"
      aria-label={t('modules.navigation')}
    >
      <div className="flex h-full min-h-0 flex-col">
        <ModuleNavList tab={tab} />
      </div>
    </aside>
  )
}
