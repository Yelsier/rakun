'use client'

import { Box, ChevronRight, ListTree } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

type ModuleNavigationItem = {
  element: HTMLElement
  id: string
  title: string
  children: ModuleNavigationItem[]
}

const moduleSelector = '[data-rakun-manager-module-item]'

const buildModuleTree = (root: HTMLElement): ModuleNavigationItem[] => {
  const elements = Array.from(root.querySelectorAll<HTMLElement>(moduleSelector))
  const items = new Map<HTMLElement, ModuleNavigationItem>()
  const result: ModuleNavigationItem[] = []

  elements.forEach((element, index) => {
    items.set(element, {
      element,
      id: element.dataset.rakunManagerModuleNavigationId ?? String(index),
      title: element.dataset.rakunManagerModuleTitle ?? `Module ${index + 1}`,
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
      ':scope [data-rakun-manager-module-trigger]'
    )

    if (trigger?.dataset.state === 'closed') {
      trigger.click()
    }
  })

  window.requestAnimationFrame(() => {
    const scrollArea = document.querySelector<HTMLElement>('[data-rakun-manager-edit-scroll-area]')
    const viewport = scrollArea?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')

    if (viewport) {
      const viewportRect = viewport.getBoundingClientRect()
      const itemRect = item.element.getBoundingClientRect()
      const top =
        viewport.scrollTop +
        itemRect.top -
        viewportRect.top -
        (viewport.clientHeight - itemRect.height) / 2

      viewport.scrollTo({ top, behavior: 'smooth' })
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
  onSelect,
}: {
  activeId?: string
  items: ModuleNavigationItem[]
  onSelect: (item: ModuleNavigationItem) => void
}) => (
  <ul>
    {items.map((item, index) =>
      item.children.length > 0 ? (
        <li key={item.id} className="relative pl-5">
          <span
            aria-hidden="true"
            className={cn(
              'absolute left-1.5 top-0 w-px bg-border/70',
              index === items.length - 1 ? 'h-4.5' : 'h-full'
            )}
          />
          <span aria-hidden="true" className="absolute left-1.5 top-4.5 h-px w-3.5 bg-border/70" />
          <Collapsible defaultOpen>
            <div
              className={cn(
                'group flex min-w-0 items-center rounded-lg transition-colors hover:bg-background/80 p-1',
                activeId === item.id && 'bg-background text-foreground shadow-sm'
              )}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0 rounded-md text-muted-foreground data-[state=open]:[&_svg]:rotate-90"
                  aria-label={`Toggle ${item.title}`}
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
              <NavigationItems activeId={activeId} items={item.children} onSelect={onSelect} />
            </CollapsibleContent>
          </Collapsible>
        </li>
      ) : (
        <li key={item.id} className="relative pl-5">
          <span
            aria-hidden="true"
            className={cn(
              'absolute left-1.5 top-0 w-px bg-border/70',
              index === items.length - 1 ? 'h-4.5' : 'h-full'
            )}
          />
          <span aria-hidden="true" className="absolute left-1.5 top-4.5 h-px w-3.5 bg-border/70" />
          <Button
            variant="ghost"
            className={cn(
              'h-9 w-full min-w-0 justify-start gap-2 rounded-lg px-2 font-normal text-muted-foreground hover:bg-background/80 hover:text-foreground',
              activeId === item.id && 'bg-background text-foreground shadow-sm hover:bg-background'
            )}
            onClick={() => onSelect(item)}
          >
            <Box className="size-3.5 shrink-0 opacity-70" />
            <span className="truncate">{item.title}</span>
          </Button>
        </li>
      )
    )}
  </ul>
)

export const ModuleNavigation = () => {
  const [activeId, setActiveId] = useState<string>()
  const [items, setItems] = useState<ModuleNavigationItem[]>([])

  const selectItem = (item: ModuleNavigationItem) => {
    setActiveId(item.id)
    revealAndScrollTo(item)
  }

  useEffect(() => {
    const contentPanel = document.querySelector<HTMLElement>(
      '[data-rakun-manager-tab-panel="content"]'
    )
    if (!contentPanel) return

    const update = () => setItems(buildModuleTree(contentPanel))
    const observer = new MutationObserver(update)

    observer.observe(contentPanel, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'data-rakun-manager-module-title',
        'data-rakun-manager-module-navigation-id',
      ],
    })
    update()

    return () => observer.disconnect()
  }, [])

  if (items.length === 0) return null

  return (
    <aside
      className="sticky top-4 hidden h-full w-60 shrink-0 self-start overflow-hidden rounded-2xl bg-muted/40 lg:block"
      aria-label="Module navigation"
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center gap-3 px-4 pb-3" style={{ paddingTop: '1rem' }}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ListTree className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-none">Modules</p>
            <p className="mt-1 text-xs text-muted-foreground">{items.length} top level</p>
          </div>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-2 pb-3" style={{ paddingTop: '0.75rem' }}>
            <NavigationItems activeId={activeId} items={items} onSelect={selectItem} />
          </div>
        </ScrollArea>
      </div>
    </aside>
  )
}
