'use client'

import { useEffect, useState } from 'react'

import { EditTabPanels } from './_components/EditTabPanels'
import { EditToolbar } from './_components/EditToolbar'
import { PreviewPanel } from './_components/PreviewPanel'
import { ModuleNavigation } from './_components/ModuleNavigation'
import { EditPageProvider, useEditPageContext } from './_context/EditPageContext'
import type { EditPageProps } from './edit.types'

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Tabs } from '@/components/ui/tabs'
import { useTranslations } from '@/i18n'

const previewResizableQuery = '(min-width: 1280px)'

const useCanResizePreview = () => {
  const [canResizePreview, setCanResizePreview] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(previewResizableQuery)
    const update = () => setCanResizePreview(mediaQuery.matches)

    mediaQuery.addEventListener('change', update)
    update()

    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  return canResizePreview
}

const EditPageContent = () => {
  const t = useTranslations()
  const { activeTab, canPreview, handleTabChange, previewState } = useEditPageContext()
  const canResizePreview = useCanResizePreview()
  const previewOpen = canPreview && previewState.previewOpen
  const moduleNavigationTab =
    activeTab === 'content' || activeTab === 'template' ? activeTab : undefined

  return (
    <div className="container mx-auto h-full min-h-0 px-4 pt-5 pb-4">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full min-h-0 w-full">
        <EditToolbar />
        {previewOpen && canResizePreview ? (
          <ResizablePanelGroup className="min-h-0 w-full flex-1" orientation="horizontal">
            <ResizablePanel style={{ overflow: 'hidden' }} defaultSize={50} minSize={350}>
              <div className="flex h-full min-h-0 min-w-0 gap-4 pr-2">
                {moduleNavigationTab ? <ModuleNavigation tab={moduleNavigationTab} /> : null}
                <div className="min-h-0 min-w-0 flex-1">
                  <EditTabPanels />
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="mx-2" />
            <ResizablePanel defaultSize={50} minSize={350}>
              <div className="pl-2">
                <PreviewPanel />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4">
            <div className="flex h-full min-h-0 min-w-0 gap-4">
              {moduleNavigationTab ? <ModuleNavigation tab={moduleNavigationTab} /> : null}
              <div className="min-h-0 min-w-0 flex-1">
                <EditTabPanels />
              </div>
            </div>
            {previewOpen ? <PreviewPanel /> : null}
          </div>
        )}
        {!previewOpen && previewState.isSeoAnalysisPending && previewState.previewUrl ? (
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
