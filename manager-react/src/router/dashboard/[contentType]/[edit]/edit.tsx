'use client'

import { useEffect, useState } from 'react'

import { EditTabPanels } from './_components/EditTabPanels'
import { EditToolbar } from './_components/EditToolbar'
import { PreviewPanel } from './_components/PreviewPanel'
import { TrashDialogs } from './_components/TrashDialogs'
import { EditPageProvider, useEditPageContext } from './_context/EditPageContext'
import type { EditPageProps } from './edit.types'

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
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
    <div className='container py-10 px-4 mx-auto'>
      <Tabs value={activeTab} onValueChange={handleTabChange} className='w-full'>
        <EditToolbar />
        <TrashDialogs />
        {previewOpen && canResizePreview ? (
          <ResizablePanelGroup className='w-full' orientation='horizontal'>
            <ResizablePanel className='min-w-[320px]' defaultSize={50} minSize={20}>
              <div className='min-w-0 pr-2'>
                <EditTabPanels />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className='mx-2' />
            <ResizablePanel className='min-w-[520px]' defaultSize={50} minSize={35}>
              <div className='min-w-[520px] pl-2'>
                <PreviewPanel />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className='grid gap-4'>
            <EditTabPanels />
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
