'use client'

import { useEffect, useState } from 'react'

import { EditTabPanels } from './_components/EditTabPanels'
import { EditToolbar } from './_components/EditToolbar'
import { PreviewPanel } from './_components/PreviewPanel'
import { ModuleNavigation } from './_components/ModuleNavigation'
import { TrashDialogs } from './_components/TrashDialogs'
import { EditPageProvider, useEditPageContext } from './_context/EditPageContext'
import type { EditPageProps } from './edit.types'

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Tabs } from '@/components/ui/tabs'

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
  const { activeTab, canPreview, handleTabChange, previewState } = useEditPageContext()
  const canResizePreview = useCanResizePreview()
  const previewOpen = canPreview && previewState.previewOpen

  return (
    <div className="container pt-10 pb-4 px-4 mx-auto h-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full h-full">
        <EditToolbar />
        <TrashDialogs />
        {previewOpen && canResizePreview ? (
          <ResizablePanelGroup className="w-full" orientation="horizontal">
            <ResizablePanel className="min-w-[320px]" defaultSize={50} minSize={20}>
              <div className="flex min-w-0 gap-4 h-full pr-2">
                {activeTab === 'content' ? <ModuleNavigation /> : null}
                <div className="min-w-0 flex-1">
                  <EditTabPanels />
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="mx-2" />
            <ResizablePanel className="min-w-130" defaultSize={50} minSize={35}>
              <div className="min-w-130 pl-2">
                <PreviewPanel />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="grid gap-4 h-full">
            <div className="flex min-w-0 gap-4 h-full">
              {activeTab === 'content' ? <ModuleNavigation /> : null}
              <div className="min-w-0 flex-1">
                <EditTabPanels />
              </div>
            </div>
            {previewOpen ? <PreviewPanel /> : null}
          </div>
        )}
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
