'use client'

import { ChevronRight, Folder, FolderOpen } from 'lucide-react'
import { memo, startTransition, useCallback, useEffect, useMemo, useState } from 'react'

import { Collapsible, CollapsibleContent } from '../../ui/collapsible'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../../ui/context-menu'
import { Skeleton } from '../../ui/skeleton'
import { useMediaLibrary } from '../contexts/MediaLibraryContext'

import { SearchInput } from '@/components/search-input'
import { useTranslations } from '@/i18n'
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

const FOLDER_SEARCH_DEBOUNCE_MS = 200

const buildFolderTree = (
  items: {
    _id: string
    name: string
    slug: string
    path: string
    parentId?: string
    description?: string
  }[]
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

const FolderSearchInput = memo(function FolderSearchInput({
  onSearchChange,
}: {
  onSearchChange: (value: string) => void
}) {
  const t = useTranslations()
  const [value, setValue] = useState('')

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        onSearchChange(value)
      })
    }, FOLDER_SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [onSearchChange, value])

  return (
    <SearchInput
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className="mb-3"
      placeholder={t('media.searchFolders')}
    />
  )
})

export default function FoldersTree({ isModal = false }: { isModal?: boolean }) {
  const t = useTranslations()
  const {
    folders,
    isLoadingFolders,
    currentFolderId,
    setCurrentFolderId,
    requestEditFolder,
    requestDeleteFolder,
  } = useMediaLibrary()

  const folderTree = useMemo(() => buildFolderTree(folders ?? []), [folders])
  const [searchTerm, setSearchTerm] = useState('')
  const handleSearchChange = useCallback((value: string) => {
    startTransition(() => {
      setSearchTerm(value)
    })
  }, [])
  const normalizedSearch = searchTerm.trim().toLowerCase()

  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set())

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
      if (!folderHasMatch(node, normalizedSearch)) return null
      const hasChildren = node.children.length > 0
      const isOpen =
        normalizedSearch.length > 0 ||
        expandedFolderIds.has(node._id) ||
        currentFolderId === node._id

      return (
        <ContextMenu key={node._id}>
          <ContextMenuTrigger asChild>
            <Collapsible open={isOpen} className="mt-2 block">
              <div
                style={depth > 0 ? { marginInlineStart: `${depth * 0.75}rem` } : undefined}
                role="button"
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
                  <FolderOpen className="size-4" />
                ) : (
                  <Folder className="size-4" />
                )}
                {node.name}
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      toggleFolder(node._id)
                    }}
                    className="ml-auto inline-flex items-center justify-center rounded-sm p-0.5 hover:bg-background/60"
                    aria-label={isOpen ? 'Collapse folder' : 'Expand folder'}
                  >
                    <ChevronRight
                      className={cn('size-3 transition-transform', isOpen && 'rotate-90')}
                    />
                  </button>
                ) : null}
              </div>
              <CollapsibleContent className="flex flex-col">
                {hasChildren ? renderFolders(node.children, depth + 1) : null}
              </CollapsibleContent>
            </Collapsible>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => requestEditFolder(node)}>
              {t('common.edit')}
            </ContextMenuItem>
            <ContextMenuItem variant="destructive" onSelect={() => requestDeleteFolder(node)}>
              {t('common.delete')}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )
    })

  return (
    <div
      className={cn(
        'relative min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-thin border-b border-r p-4 lg:h-full lg:min-w-56 lg:border-b-0',
        isModal && 'max-lg:max-h-[30svh]'
      )}
    >
      <div className="sticky top-0 z-10 -mx-1 mb-3 bg-background px-1 pb-1">
        <FolderSearchInput onSearchChange={handleSearchChange} />
      </div>

      <button
        type="button"
        onClick={() => setCurrentFolderId(null)}
        className={`mb-2 flex w-full items-center gap-2 rounded px-3 py-1.5 text-left font-medium text-sm transition-colors ${
          currentFolderId === null
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        <Folder className="size-4" />
        {t('media.baseFolder')}
      </button>

      {isLoadingFolders ? (
        <div className="space-y-2 px-1 py-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={`folder-skeleton-${index}`} className="h-8 w-full rounded-md" />
          ))}
        </div>
      ) : (
        renderFolders(folderTree)
      )}
    </div>
  )
}
