'use client'

import { ChevronRight, Folder, FolderOpen, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Collapsible, CollapsibleContent } from '../../ui/collapsible'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../../ui/context-menu'
import { Skeleton } from '../../ui/skeleton'
import { useMediaLibrary } from '../contexts/MediaLibraryContext'

import { cn } from '@/lib/utils'

type FolderNode = {
  _id: string
  name: string
  slug: string
  path: string
  parentId?: string
  description?: string
  children: FolderNode[]
}

const buildFolderTree = (
  items: {
    _id: string
    name: string
    slug: string
    path: string
    parentId?: string
    description?: string
  }[],
): FolderNode[] => {
  const map = new Map<string, FolderNode>()
  const roots: FolderNode[] = []

  items.forEach((item) => {
    map.set(item._id, {
      ...item,
      children: [],
    })
  })

  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)?.children.push(node)
      return
    }
    roots.push(node)
  })

  const sortNodes = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    nodes.forEach((node) => sortNodes(node.children))
  }

  sortNodes(roots)

  return roots
}

const folderHasMatch = (node: FolderNode, search: string): boolean => {
  if (!search) return true
  if (node.name.toLowerCase().includes(search)) return true
  if (node.path.toLowerCase().includes(search)) return true
  return node.children.some((child) => folderHasMatch(child, search))
}

export default function FoldersTree({ isModal = false }: { isModal?: boolean }) {
  const {
    folders,
    isLoadingFolders,
    currentFolderId,
    setCurrentFolderId,
    requestEditFolder,
    requestDeleteFolder,
  } = useMediaLibrary()

  const folderTree = useMemo(() => buildFolderTree(folders ?? []), [folders])
  const [search, setSearch] = useState('')
  const searchTerm = search.trim().toLowerCase()

  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(
    () => new Set(),
  )

  const toggleFolder = (folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const expandFolder = (folderId: string) => {
    setExpandedFolderIds((prev) => {
      if (prev.has(folderId)) return prev
      const next = new Set(prev)
      next.add(folderId)
      return next
    })
  }

  const renderFolders = (nodes: FolderNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => {
      if (!folderHasMatch(node, searchTerm)) return null
      const hasChildren = node.children.length > 0
      const isOpen =
        searchTerm.length > 0 ||
        expandedFolderIds.has(node._id) ||
        currentFolderId === node._id

      return (
        <ContextMenu key={node._id}>
          <ContextMenuTrigger asChild>
            <Collapsible open={isOpen} className='mt-2 block'>
              <div
                style={{ marginLeft: depth * 12 }}
                role='button'
                tabIndex={0}
                className={`flex items-center gap-2 rounded px-3 py-1.5 text-left font-medium text-sm transition-colors ${
                  node._id === currentFolderId
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
                onClick={() => {
                  setCurrentFolderId(node._id)
                  if (hasChildren) expandFolder(node._id)
                }}
                onDoubleClick={() => {
                  if (hasChildren) toggleFolder(node._id)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setCurrentFolderId(node._id)
                    if (hasChildren) expandFolder(node._id)
                  }
                }}
              >
                {node._id === currentFolderId ? (
                  <FolderOpen className='size-4' />
                ) : (
                  <Folder className='size-4' />
                )}
                {node.name}
                {hasChildren ? (
                  <button
                    type='button'
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      toggleFolder(node._id)
                    }}
                    className='ml-auto inline-flex items-center justify-center rounded-sm p-0.5 hover:bg-background/60'
                    aria-label={isOpen ? 'Collapse folder' : 'Expand folder'}
                  >
                    <ChevronRight
                      className={cn(
                        'size-3 transition-transform',
                        isOpen && 'rotate-90',
                      )}
                    />
                  </button>
                ) : null}
              </div>
              <CollapsibleContent className='flex flex-col'>
                {hasChildren ? renderFolders(node.children, depth + 1) : null}
              </CollapsibleContent>
            </Collapsible>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => requestEditFolder(node)}>
              Edit
            </ContextMenuItem>
            <ContextMenuItem
              variant='destructive'
              onSelect={() => requestDeleteFolder(node)}
            >
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )
    })

  return (
    <div
      className={cn(
        'relative min-h-80 overflow-y-auto overflow-x-hidden border-r border-b p-4 lg:h-[calc(100vh-6rem)] lg:border-b-0',
        isModal ? 'h-[calc(100vh-11rem)]' : '',
      )}
    >
      <div className='sticky top-0 z-10 mb-3 flex h-9 items-center gap-2 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50'>
        <Search className='size-4 text-muted-foreground' />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='w-full bg-transparent text-sm outline-none'
          type='text'
          placeholder='Search folders...'
        />
      </div>

      <button
        type='button'
        onClick={() => setCurrentFolderId(null)}
        className={`mb-2 flex w-full items-center gap-2 rounded px-3 py-1.5 text-left font-medium text-sm transition-colors ${
          currentFolderId === null
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        <Folder className='size-4' />
        Base folder
      </button>

      {isLoadingFolders ? (
        <div className='space-y-2 px-1 py-2'>
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton
              key={`folder-skeleton-${index}`}
              className='h-8 w-full rounded-md'
            />
          ))}
        </div>
      ) : (
        renderFolders(folderTree)
      )}
    </div>
  )
}
