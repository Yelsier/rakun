import type { LinkfieldValue, MenuItemValue } from '@rakun-kit/core/client'

export const MENU_INDENT_WIDTH = 28

export type EditorMenuItem = LinkfieldValue & {
  _editorId: string
  children: EditorMenuItem[]
}

export type FlatMenuItem = Omit<EditorMenuItem, 'children'> & {
  children: EditorMenuItem[]
  depth: number
}

export const hydrateMenuItems = (
  items: MenuItemValue[],
  createId: () => string,
): EditorMenuItem[] =>
  items.map((item) => ({
    ...item,
    _editorId: createId(),
    children: hydrateMenuItems(item.children, createId),
  }))

export const stripMenuEditorIds = (items: EditorMenuItem[]): MenuItemValue[] =>
  items.map(({ _editorId: _ignored, children, ...link }) => ({
    ...link,
    children: stripMenuEditorIds(children),
  })) as MenuItemValue[]

export const flattenMenuItems = (
  items: EditorMenuItem[],
  depth = 0,
): FlatMenuItem[] =>
  items.flatMap((item) => [
    { ...item, depth },
    ...flattenMenuItems(item.children, depth + 1),
  ])

export const buildMenuTree = (items: FlatMenuItem[]): EditorMenuItem[] => {
  const roots: EditorMenuItem[] = []
  const parents: EditorMenuItem[] = []

  for (const flatItem of items) {
    const depth = Math.max(0, Math.min(flatItem.depth, parents.length))
    const { depth: _depth, children: _children, ...link } = flatItem
    const item = { ...link, children: [] } as unknown as EditorMenuItem

    if (depth === 0) roots.push(item)
    else parents[depth - 1].children.push(item)

    parents[depth] = item
    parents.length = depth + 1
  }

  return roots
}

const getSubtreeEnd = (items: FlatMenuItem[], start: number) => {
  const depth = items[start].depth
  let end = start + 1
  while (end < items.length && items[end].depth > depth) end += 1
  return end
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const moveMenuSubtree = ({
  items,
  activeId,
  overId,
  horizontalOffset,
}: {
  items: EditorMenuItem[]
  activeId: string
  overId: string
  horizontalOffset: number
}): EditorMenuItem[] => {
  const flat = flattenMenuItems(items)
  const activeIndex = flat.findIndex((item) => item._editorId === activeId)
  const overIndex = flat.findIndex((item) => item._editorId === overId)
  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return items

  const subtreeEnd = getSubtreeEnd(flat, activeIndex)
  if (overIndex > activeIndex && overIndex < subtreeEnd) return items

  const subtree = flat.slice(activeIndex, subtreeEnd)
  const remaining = [...flat.slice(0, activeIndex), ...flat.slice(subtreeEnd)]
  const overRemainingIndex = remaining.findIndex((item) => item._editorId === overId)
  if (overRemainingIndex < 0) return items

  const movingDown = activeIndex < overIndex
  const nestingUnderOver = horizontalOffset >= MENU_INDENT_WIDTH / 2
  const insertIndex = nestingUnderOver
    ? getSubtreeEnd(remaining, overRemainingIndex)
    : overRemainingIndex + (movingDown ? 1 : 0)
  const previous = remaining[insertIndex - 1]
  const next = remaining[insertIndex]
  const maxDepth = previous ? previous.depth + 1 : 0
  const minDepth = Math.min(next?.depth ?? 0, maxDepth)
  const requestedDepth = nestingUnderOver
    ? remaining[overRemainingIndex].depth + 1
    : subtree[0].depth + Math.round(horizontalOffset / MENU_INDENT_WIDTH)
  const nextDepth = clamp(requestedDepth, minDepth, maxDepth)
  const depthDelta = nextDepth - subtree[0].depth
  const movedSubtree = subtree.map((item) => ({
    ...item,
    depth: item.depth + depthDelta,
  }))

  return buildMenuTree([
    ...remaining.slice(0, insertIndex),
    ...movedSubtree,
    ...remaining.slice(insertIndex),
  ])
}

export const changeMenuItemDepth = (
  items: EditorMenuItem[],
  itemId: string,
  direction: -1 | 1,
): EditorMenuItem[] => {
  const flat = flattenMenuItems(items)
  const index = flat.findIndex((item) => item._editorId === itemId)
  if (index < 0) return items

  const subtreeEnd = getSubtreeEnd(flat, index)
  const previous = flat[index - 1]
  const maxDepth = previous ? previous.depth + 1 : 0
  const nextDepth = clamp(flat[index].depth + direction, 0, maxDepth)
  const depthDelta = nextDepth - flat[index].depth
  if (depthDelta === 0) return items

  return buildMenuTree(
    flat.map((item, itemIndex) =>
      itemIndex >= index && itemIndex < subtreeEnd
        ? { ...item, depth: item.depth + depthDelta }
        : item,
    ),
  )
}

export const removeMenuItem = (
  items: EditorMenuItem[],
  itemId: string,
): EditorMenuItem[] => {
  const flat = flattenMenuItems(items)
  const index = flat.findIndex((item) => item._editorId === itemId)
  if (index < 0) return items
  return buildMenuTree([
    ...flat.slice(0, index),
    ...flat.slice(getSubtreeEnd(flat, index)),
  ])
}
