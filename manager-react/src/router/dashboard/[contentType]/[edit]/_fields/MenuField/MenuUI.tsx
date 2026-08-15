'use client'

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { LinkfieldValue, MenuItemValue } from '@rakun-kit/core/client'
import { LinkInputSchema } from '@rakun-kit/core/client'
import type { TranslatableValue } from '@rakun-kit/core/types'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Menu as MenuIcon,
  Plus,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type { MenuPropsRef } from '.'
import LinkUI from '../LinkField/LinkUI'
import { useFieldValues } from '../shared'
import { FieldWrapper } from '../shared/FieldWrapper'
import {
  MENU_INDENT_WIDTH,
  changeMenuItemDepth,
  flattenMenuItems,
  hydrateMenuItems,
  moveMenuSubtree,
  removeMenuItem,
  stripMenuEditorIds,
  type EditorMenuItem,
  type FlatMenuItem,
} from './menuTree'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { useTranslations } from '@/i18n'

let fallbackId = 0
const createEditorId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  fallbackId += 1
  return `menu-item-${fallbackId}`
}

const isTranslatableValue = (value: unknown): value is TranslatableValue<MenuItemValue[]> =>
  !!value && typeof value === 'object' && '_tag' in value && value._tag === 'Translatable'

const hydrateDefaultData = (
  value: unknown,
  translatable: boolean
): EditorMenuItem[] | TranslatableValue<EditorMenuItem[]> | undefined => {
  if (translatable && isTranslatableValue(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([language, items]) =>
        language === '_tag'
          ? [language, 'Translatable']
          : [language, hydrateMenuItems(Array.isArray(items) ? items : [], createEditorId)]
      )
    ) as TranslatableValue<EditorMenuItem[]>
  }

  return Array.isArray(value)
    ? hydrateMenuItems(value as MenuItemValue[], createEditorId)
    : undefined
}

const mapTree = (
  items: EditorMenuItem[],
  itemId: string,
  map: (item: EditorMenuItem) => EditorMenuItem
): EditorMenuItem[] =>
  items.map((item) => {
    if (item._editorId === itemId) return map(item)
    const children = mapTree(item.children, itemId, map)
    return children === item.children ? item : { ...item, children }
  })

const stripEditorValue = (value: unknown) => {
  if (Array.isArray(value)) return stripMenuEditorIds(value as EditorMenuItem[])
  if (!isTranslatableValue(value)) return value

  return Object.fromEntries(
    Object.entries(value).map(([language, items]) =>
      language === '_tag'
        ? [language, 'Translatable']
        : [language, Array.isArray(items) ? stripMenuEditorIds(items as EditorMenuItem[]) : []]
    )
  )
}

const getItemLabel = (item: FlatMenuItem, fallback: string) => {
  if (typeof item.title === 'string' && item.title.trim()) return item.title
  if ('href' in item && typeof item.href === 'string' && item.href.trim()) return item.href
  return fallback
}

const MenuItemCard = ({
  item,
  expanded,
  onExpandedChange,
  onIndent,
  onOutdent,
  onRemove,
  onLinkValueChange,
  parentContentType,
}: {
  item: FlatMenuItem
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  onIndent: () => void
  onOutdent: () => void
  onRemove: () => void
  onLinkValueChange: (value: LinkfieldValue) => void
  parentContentType?: MenuPropsRef['parentContentType']
}) => {
  const t = useTranslations()
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._editorId })

  return (
    <div
      className={cn('relative', isDragging && 'z-10 opacity-50')}
      ref={setNodeRef}
      style={{
        paddingLeft: item.depth * MENU_INDENT_WIDTH,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <Collapsible open={expanded} onOpenChange={onExpandedChange}>
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="flex min-w-0 flex-row items-center gap-1 px-2 py-2">
            <Button
              aria-label={t('menuField.dragItem')}
              className="shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
              ref={setActivatorNodeRef}
              size="icon"
              type="button"
              variant="ghost"
              {...attributes}
              {...listeners}
            >
              <GripVertical />
            </Button>
            <CollapsibleTrigger asChild>
              <Button className="min-w-0 flex-1 justify-start gap-2" type="button" variant="ghost">
                <ChevronDown
                  className={cn('shrink-0 transition-transform', !expanded && '-rotate-90')}
                />
                <span className="truncate">{getItemLabel(item, t('menuField.untitledItem'))}</span>
              </Button>
            </CollapsibleTrigger>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                aria-label={t('menuField.outdentItem')}
                disabled={item.depth === 0}
                onClick={onOutdent}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ChevronLeft />
              </Button>
              <Button
                aria-label={t('menuField.indentItem')}
                onClick={onIndent}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ChevronRight />
              </Button>
              <Button
                aria-label={t('menuField.removeItem')}
                className="text-destructive hover:text-destructive"
                onClick={onRemove}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2 />
              </Button>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="border-t px-4 py-4">
              <LinkUI
                config={{
                  type: 'Link',
                  ui: 'Link',
                  capabilities: {
                    valueKind: 'object',
                    dynamic: {
                      properties: { title: 'string', href: 'string' },
                      mapProperties: true,
                    },
                  },
                }}
                defaultData={item}
                id={`menu-link-${item._editorId}`}
                isDynamic={false}
                isRequired
                isTranslatable={false}
                onLinkValueChange={onLinkValueChange}
                parentContentType={parentContentType}
                visibility="all"
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}

const MenuUI: React.FC<MenuPropsRef> = ({ id, ref, ...props }) => {
  const t = useTranslations()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const defaultData = useMemo(
    () => hydrateDefaultData(props.defaultData, props.isTranslatable),
    [props.defaultData, props.isTranslatable]
  )
  const { value, errors, onValueChange, getValue, getState } = useFieldValues<EditorMenuItem[]>({
    id,
    isRequired: props.isRequired,
    isTranslatable: props.isTranslatable,
    defaultData,
    defaultValue: [],
    validateValue: (items) => {
      const invalid = flattenMenuItems(items).some(
        ({ children: _children, depth: _depth, _editorId, ...link }) =>
          !LinkInputSchema.safeParse(link).success
      )
      return invalid ? t('menuField.destinationRequired') : null
    },
  })
  const flatItems = useMemo(() => flattenMenuItems(value), [value])
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const updateValue = (nextValue: EditorMenuItem[]) => onValueChange(nextValue)

  const addItem = () => {
    const item: EditorMenuItem = {
      _editorId: createEditorId(),
      href: '',
      title: '',
      children: [],
    }
    updateValue([...value, item])
    setExpandedItems((current) => new Set(current).add(item._editorId))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over) return
    updateValue(
      moveMenuSubtree({
        items: value,
        activeId: String(event.active.id),
        overId: String(event.over.id),
        horizontalOffset: event.delta.x,
      })
    )
  }

  const getMenuValue = () => stripEditorValue(getValue())
  const getMenuState = () => stripEditorValue(getState())

  return (
    <FieldWrapper id={id} errors={errors} getValue={getMenuValue} getState={getMenuState} ref={ref}>
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <MenuIcon className="size-4 shrink-0" />
            {t('menuField.instructions')}
          </span>
          <Button onClick={addItem} size="sm" type="button" variant="outline">
            <Plus />
            {t('menuField.addItem')}
          </Button>
        </div>
        {flatItems.length === 0 ? (
          <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            {t('menuField.empty')}
          </div>
        ) : (
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <SortableContext
              items={flatItems.map((item) => item._editorId)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid gap-2">
                {flatItems.map((item) => (
                  <MenuItemCard
                    expanded={expandedItems.has(item._editorId)}
                    item={item}
                    key={item._editorId}
                    onExpandedChange={(expanded) =>
                      setExpandedItems((current) => {
                        const next = new Set(current)
                        if (expanded) next.add(item._editorId)
                        else next.delete(item._editorId)
                        return next
                      })
                    }
                    onIndent={() => updateValue(changeMenuItemDepth(value, item._editorId, 1))}
                    onLinkValueChange={(link) =>
                      updateValue(
                        mapTree(value, item._editorId, (current) => ({
                          ...current,
                          ...link,
                        }))
                      )
                    }
                    onOutdent={() => updateValue(changeMenuItemDepth(value, item._editorId, -1))}
                    onRemove={() => updateValue(removeMenuItem(value, item._editorId))}
                    parentContentType={props.parentContentType}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </FieldWrapper>
  )
}

export default MenuUI
