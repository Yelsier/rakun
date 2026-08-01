'use client'

import { Box, ChevronRight, GripVertical, ListTree, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable'
import { useTranslations } from '@/i18n'
import { cn } from '@/lib/utils'

import { dispatchModuleReorder } from './module-navigation-reorder'
import {
  captureModuleNavPositions,
  playModuleNavFlip,
} from './module-reorder-animation'

type ModuleNavigationItem = {
  element: HTMLElement
  fieldId: string
  id: string
  title: string
  uid: string
  children: ModuleNavigationItem[]
}

const moduleSelector = '[data-rakun-manager-module-item]'

const getOrderSignature = (nodes: ModuleNavigationItem[]): string =>
  nodes.map((node) => `${node.uid}[${getOrderSignature(node.children)}]`).join(',')

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

const NavigationItems = ({
  activeId,
  items,
  onReorder,
  onSelect,
}: {
  activeId?: string
  items: ModuleNavigationItem[]
  onReorder: (items: ModuleNavigationItem[]) => void
  onSelect: (item: ModuleNavigationItem) => void
}) => {
  const t = useTranslations()

  if (items.length === 0) return null

  return (
    <Sortable
      value={items}
      onValueChange={onReorder}
      getItemValue={(item) => item.id}
      orientation="vertical"
    >
      <SortableContent withoutSlot>
        <ul>
          {items.map((item, index) => (
            <SortableItem key={item.id} value={item.id} asChild>
              <li
                className="relative pl-5"
                data-rakun-manager-module-nav-item={item.uid}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-1.5 top-0 w-px bg-border/70',
                    index === items.length - 1 ? 'h-4.5' : 'h-full',
                  )}
                />
                <span
                  aria-hidden="true"
                  className="absolute left-1.5 top-4.5 h-px w-3.5 bg-border/70"
                />
                {item.children.length > 0 ? (
                  <Collapsible defaultOpen>
                    <div
                      className={cn(
                        'group flex min-w-0 items-center rounded-lg transition-colors hover:bg-background/80 p-1',
                        activeId === item.id && 'bg-background text-foreground shadow-sm',
                      )}
                    >
                      <SortableItemHandle asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 shrink-0 rounded-md text-muted-foreground"
                          aria-label={t('modules.reorder')}
                        >
                          <GripVertical className="size-3.5" />
                        </Button>
                      </SortableItemHandle>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 shrink-0 rounded-md text-muted-foreground data-[state=open]:[&_svg]:rotate-90"
                          aria-label={t('modules.toggleModule', { title: item.title })}
                        >
                          <ChevronRight className="size-3.5 transition-transform" />
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        variant="ghost"
                        className="h-7 min-w-0 flex-1 justify-start gap-2 px-2 font-normal hover:bg-transparent"
                        onClick={() => onSelect(item)}
                      >
                        <Box className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{item.title}</span>
                      </Button>
                    </div>
                    <CollapsibleContent className="ml-5 pt-1">
                      <NavigationItems
                        activeId={activeId}
                        items={item.children}
                        onReorder={onReorder}
                        onSelect={onSelect}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <div
                    className={cn(
                      'group flex min-w-0 items-center rounded-lg transition-colors',
                      activeId === item.id && 'bg-background text-foreground shadow-sm',
                    )}
                  >
                    <SortableItemHandle asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0 rounded-md text-muted-foreground"
                        aria-label={t('modules.reorder')}
                      >
                        <GripVertical className="size-3.5" />
                      </Button>
                    </SortableItemHandle>
                    <Button
                      variant="ghost"
                      className={cn(
                        'h-9 min-w-0 flex-1 justify-start gap-2 rounded-lg px-2 font-normal text-muted-foreground hover:bg-background/80 hover:text-foreground',
                        activeId === item.id &&
                          'bg-transparent text-foreground shadow-none hover:bg-transparent',
                      )}
                      onClick={() => onSelect(item)}
                    >
                      <Box className="size-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{item.title}</span>
                    </Button>
                  </div>
                )}
              </li>
            </SortableItem>
          ))}
        </ul>
      </SortableContent>
    </Sortable>
  )
}

export const ModuleNavigation = () => {
  const t = useTranslations()
  const [activeId, setActiveId] = useState<string>()
  const [items, setItems] = useState<ModuleNavigationItem[]>([])
  const draggingRef = useRef(false)
  const itemsRef = useRef(items)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const selectItem = (item: ModuleNavigationItem) => {
    setActiveId(item.id)
    revealAndScrollTo(item)
  }

  const openModulePicker = () => {
    const contentPanel = document.querySelector<HTMLElement>(
      '[data-rakun-manager-tab-panel="content"]',
    )
    const trigger = contentPanel?.querySelector<HTMLButtonElement>(
      '[data-rakun-manager-add-module-trigger]',
    )

    trigger?.click()
  }

  const handleReorder = (nextItems: ModuleNavigationItem[]) => {
    if (nextItems.length === 0) return

    draggingRef.current = true
    setItems((current) => {
      const replaceSiblings = (
        nodes: ModuleNavigationItem[],
      ): ModuleNavigationItem[] => {
        if (nodes.some((node) => node.id === nextItems[0]?.id)) {
          return nextItems
        }

        return nodes.map((node) => ({
          ...node,
          children: replaceSiblings(node.children),
        }))
      }

      return replaceSiblings(current)
    })

    dispatchModuleReorder({
      fieldId: nextItems[0].fieldId,
      orderedUids: nextItems.map((item) => item.uid),
    })

    window.setTimeout(() => {
      draggingRef.current = false
    }, 250)
  }

  useEffect(() => {
    const contentPanel = document.querySelector<HTMLElement>(
      '[data-rakun-manager-tab-panel="content"]',
    )
    if (!contentPanel) return

    const update = () => {
      if (draggingRef.current) return

      const next = buildModuleTree(contentPanel, (index) =>
        t('modules.fallbackTitleNumbered', { number: index + 1 }),
      )
      const orderChanged =
        getOrderSignature(itemsRef.current) !== getOrderSignature(next)

      if (!orderChanged) {
        setItems(next)
        return
      }

      const first = captureModuleNavPositions()
      flushSync(() => {
        setItems(next)
      })
      playModuleNavFlip(first)
    }
    const observer = new MutationObserver(update)

    observer.observe(contentPanel, {
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

    return () => observer.disconnect()
  }, [t])

  return (
    <aside
      className="sticky top-4 hidden h-full w-60 shrink-0 self-start overflow-hidden rounded-xl bg-muted/40 lg:block"
      aria-label={t('modules.navigation')}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-3 px-4 pb-3" style={{ paddingTop: '1rem' }}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ListTree className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-none">{t('modules.title')}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('modules.topLevelCount', { count: items.length })}
            </p>
          </div>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-2 pb-3" style={{ paddingTop: '0.75rem' }}>
            {items.length > 0 ? (
              <NavigationItems
                activeId={activeId}
                items={items}
                onReorder={handleReorder}
                onSelect={selectItem}
              />
            ) : (
              <p className="px-2 text-xs text-muted-foreground">{t('modules.empty')}</p>
            )}
          </div>
        </ScrollArea>
        <div className="shrink-0 border-t p-3">
          <Button variant="outline" className="w-full justify-start" onClick={openModulePicker}>
            <Plus />
            {t('modules.addModule')}
          </Button>
        </div>
      </div>
    </aside>
  )
}
