import { describe, expect, it } from 'bun:test'

import {
  buildMenuTree,
  changeMenuItemDepth,
  flattenMenuItems,
  moveMenuSubtree,
  removeMenuItem,
  type EditorMenuItem,
} from './menuTree'

const item = (
  id: string,
  children: EditorMenuItem[] = [],
): EditorMenuItem => ({
  _editorId: id,
  href: `/${id}/`,
  title: id,
  children,
})

describe('menu tree', () => {
  it('round-trips nested values through the flat drag representation', () => {
    const tree = [item('a', [item('a-1')]), item('b')]
    expect(buildMenuTree(flattenMenuItems(tree))).toEqual(tree)
  })

  it('moves a complete subtree and nests it using horizontal drag offset', () => {
    const tree = [item('a', [item('a-1')]), item('b')]
    const moved = moveMenuSubtree({
      items: tree,
      activeId: 'b',
      overId: 'a',
      horizontalOffset: 28,
    })

    expect(moved).toEqual([item('a', [item('a-1'), item('b')])])
  })

  it('indents, outdents, and removes nodes together with their children', () => {
    const initial = [item('a'), item('b', [item('b-1')]), item('c')]
    const indented = changeMenuItemDepth(initial, 'b', 1)
    expect(indented).toEqual([item('a', [item('b', [item('b-1')])]), item('c')])

    const outdented = changeMenuItemDepth(indented, 'b', -1)
    expect(outdented).toEqual(initial)
    expect(removeMenuItem(initial, 'b')).toEqual([item('a'), item('c')])
  })
})
