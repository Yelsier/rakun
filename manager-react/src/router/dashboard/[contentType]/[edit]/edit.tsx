'use client'

import { ListTree, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { EditSectionNavigation } from './_components/EditSectionNavigation'
import { EditTabPanels } from './_components/EditTabPanels'
import { EditToolbar } from './_components/EditToolbar'
import { PreviewPanel } from './_components/PreviewPanel'
import { ModuleNavigation } from './_components/ModuleNavigation'
import { EditPageProvider, useEditPageContext } from './_context/EditPageContext'
import type { EditPageProps } from './edit.types'

import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useSidebar } from '@/components/ui/sidebar'
import { Tabs } from '@/components/ui/tabs'
import { useIsomorphicLayoutEffect } from '@/hooks/use-isomorphic-layout-effect'
import { useTranslations } from '@/i18n'
import { cn } from '@/lib/utils'

const splitEditorQuery = '(min-width: 1440px)'

const useCanSplitEditor = () => {
  const [canSplitEditor, setCanSplitEditor] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(splitEditorQuery)
    const update = () => setCanSplitEditor(mediaQuery.matches)

    mediaQuery.addEventListener('change', update)
    update()

    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  return canSplitEditor
}

const EditorSurface = () => {
  const t = useTranslations()
  const { activeTab } = useEditPageContext()
  const [moduleNavigationOpen, setModuleNavigationOpen] = useState(false)
  const moduleNavigationTab =
    activeTab === 'content' || activeTab === 'template' ? activeTab : undefined

  useEffect(() => {
    setModuleNavigationOpen(false)
  }, [activeTab])

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border bg-background md:flex-row">
      <EditSectionNavigation />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden flex flex-col">
          {moduleNavigationTab ? (
            <div className="flex items-center border-b px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-expanded={moduleNavigationOpen}
                onClick={() => setModuleNavigationOpen((open) => !open)}
              >
                <ListTree />
                {t('modules.navigation')}
              </Button>
            </div>
          ) : null}
          <div
            className={cn(
              'h-full min-h-0 min-w-0',
              activeTab !== 'seo' && 'px-4 pr-2 md:px-5 md:pr-3 py-4'
            )}
          >
            <EditTabPanels moduleNavigationInset={Boolean(moduleNavigationTab)} />
          </div>
          {moduleNavigationTab ? (
            <>
              <button
                type="button"
                aria-label={t('common.close')}
                className={cn(
                  'absolute inset-0 z-20 bg-background/55 backdrop-blur-[1px] transition-opacity',
                  moduleNavigationOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                )}
                onClick={() => setModuleNavigationOpen(false)}
              />
              <div
                className={cn(
                  'absolute inset-y-2 left-2 z-30 w-[min(19rem,calc(100%_-_1rem))] transition-[transform,opacity] duration-200 ease-out',
                  moduleNavigationOpen
                    ? 'translate-x-0 opacity-100 shadow-2xl'
                    : 'pointer-events-none -translate-x-[calc(100%_+_1rem)] opacity-0'
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 z-10 size-8"
                  aria-label={t('common.close')}
                  onClick={() => setModuleNavigationOpen(false)}
                >
                  <X />
                </Button>
                <ModuleNavigation
                  tab={moduleNavigationTab}
                  className="border bg-background"
                  onNavigate={() => setModuleNavigationOpen(false)}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
}

const EditPageContent = () => {
  const t = useTranslations()
  const {
    activeTab,
    canPreview,
    contentTypeId,
    contentTypeName,
    form,
    handleTabChange,
    languageCode,
    localeVariantRoute,
    previewState,
    template,
  } = useEditPageContext()
  const {
    isMobile,
    setOpen: setLayoutSidebarOpen,
    setOpenMobile: setLayoutSidebarOpenMobile,
  } = useSidebar()
  const canSplitEditor = useCanSplitEditor()
  const autoPreviewRequested = useRef<string | null>(null)
  const layoutSidebarClosed = useRef(false)
  const [compactEditorOpen, setCompactEditorOpen] = useState(false)
  const compactEditorAvailable = !isMobile && canPreview && !canSplitEditor
  const autoPreviewKey = `${contentTypeName}:${contentTypeId ?? 'new'}:${languageCode}:${localeVariantRoute?.key ?? ''}`

  useEffect(() => {
    if (isMobile || !canPreview || form.formRevision === 0 || template.pending) return
    if (autoPreviewRequested.current === autoPreviewKey) return

    autoPreviewRequested.current = autoPreviewKey
    void previewState.handlePreview().then((started) => {
      if (!started && autoPreviewRequested.current === autoPreviewKey) {
        autoPreviewRequested.current = null
      }
    })
  }, [
    autoPreviewKey,
    canPreview,
    form.formRevision,
    isMobile,
    previewState.handlePreview,
    template.pending,
  ])

  useIsomorphicLayoutEffect(() => {
    if (layoutSidebarClosed.current) return

    layoutSidebarClosed.current = true
    setLayoutSidebarOpen(false)
    setLayoutSidebarOpenMobile(false)
  }, [setLayoutSidebarOpen, setLayoutSidebarOpenMobile])

  return (
    <div className="h-full min-h-0 w-full md:px-3 pt-3 pb-3">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        orientation={isMobile ? 'horizontal' : 'vertical'}
        className="flex h-full min-h-0 w-full flex-col gap-3"
      >
        <EditToolbar
          compactEditorAvailable={compactEditorAvailable}
          compactEditorOpen={compactEditorOpen}
          onCompactEditorOpenChange={setCompactEditorOpen}
        />
        {isMobile ? (
          <div className="min-h-0 flex-1">
            <EditorSurface />
          </div>
        ) : canPreview && canSplitEditor ? (
          <ResizablePanelGroup className="min-h-0 w-full flex-1" orientation="horizontal">
            <ResizablePanel style={{ overflow: 'hidden' }} defaultSize="28%" minSize="480px">
              <div className="h-full min-h-0 min-w-0 pr-2">
                <EditorSurface />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="mx-2 transition-colors hover:bg-primary" />
            <ResizablePanel style={{ overflow: 'hidden' }} defaultSize="72%" minSize="520px">
              <div className="h-full min-h-0 min-w-0 pl-2">
                <PreviewPanel className="shadow-sm" />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : canPreview ? (
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <PreviewPanel className="shadow-sm" />
            <div
              aria-hidden={!compactEditorOpen}
              className={cn(
                'absolute inset-y-2 left-2 z-40 w-[min(calc(100%_-_1rem),36rem)]',
                compactEditorOpen ? 'block shadow-2xl' : 'hidden'
              )}
            >
              <EditorSurface />
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            <EditorSurface />
          </div>
        )}
        {(isMobile || !canPreview) &&
        previewState.isSeoAnalysisPending &&
        previewState.previewUrl ? (
          <iframe
            key={`seo-analysis:${previewState.previewUrl}`}
            ref={previewState.previewFrameRef}
            aria-hidden
            src={previewState.previewUrl}
            style={{
              border: 0,
              height: 1,
              opacity: 0,
              pointerEvents: 'none',
              position: 'fixed',
              width: 1,
            }}
            tabIndex={-1}
            title={t('contentEdit.seoAnalysisFrameTitle')}
          />
        ) : null}
      </Tabs>
    </div>
  )
}

const EditPage = (props: EditPageProps) => (
  <EditPageProvider {...props}>
    <EditPageContent />
  </EditPageProvider>
)

export default EditPage
