'use client'

import { AlertTriangle } from 'lucide-react'

import ContentTypeEdit from '../ContentTypeEdit'
import { useEditPageContext } from '../_context/EditPageContext'
import VersionHistory from './Versions'
import { RouteLayoutModuleTabContent } from './RouteLayoutModuleTabContent'
import { ContentVariants } from './LocaleVariants'
import { SeoTabContent } from './SeoTabContent'
import { CollaborativeTemplateEditor } from './CollaborativeTemplateEditor'

import { TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTranslations } from '@/i18n'

export const EditTabPanels = () => {
  const t = useTranslations()
  const {
    activeTab,
    canRestoreVersions,
    contentType,
    contentTypeId,
    contentTypeName,
    form,
    hasVersioning,
    hasLocaleVariants,
    onAfterRestore,
    routeLayout,
    sections,
    template,
  } = useEditPageContext()

  return (
    <ScrollArea className="h-full min-h-0 pr-4" data-rakun-manager-edit-scroll-area>
      <div className="min-h-full min-w-0">
        {sections.hasIterables ? (
          <TabsContent
            value="content"
            forceMount
            hidden={activeTab !== 'content'}
            className="w-full h-full"
            data-rakun-manager-tab-panel="content"
            data-tour="content-edit-fields"
          >
            <ContentTypeEdit
              key={`iterables:${form.formRevision}`}
              defaultData={form.draft.current}
              ref={form.iterablesRef}
              contentType={sections.iterables}
              parentContentType={contentType}
              id={contentTypeName}
              collapsible
              hideTitle
              collaborative
            />
          </TabsContent>
        ) : null}
        {template.enabled && template.contentType && template.defaultData ? (
          <TabsContent
            value="template"
            forceMount
            hidden={activeTab !== 'template'}
            className="w-full h-full"
            data-rakun-manager-tab-panel="template"
            data-tour="content-edit-fields"
          >
            <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-500/10 p-3 text-sm text-amber-950 dark:border-amber-500/40 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{t('contentEdit.sharedTemplateWarning')}</p>
            </div>
            <div
              className={template.state?.canUpdate ? undefined : 'pointer-events-none opacity-70'}
              aria-disabled={!template.state?.canUpdate}
            >
              {template.state?.canUpdate ? (
                <CollaborativeTemplateEditor
                  ref={template.ref}
                  contentType={template.contentType}
                  initialData={template.defaultData}
                  parentContentType={contentType}
                  onPendingChange={template.onPendingChange}
                  onStatusChange={template.onStatusChange}
                />
              ) : (
                <ContentTypeEdit
                  key={`template:${template.state?.revision ?? 'new'}`}
                  defaultData={template.defaultData}
                  ref={template.ref}
                  contentType={template.contentType}
                  parentContentType={contentType}
                  id={`${contentTypeName}Template`}
                  collapsible
                  hideTitle
                />
              )}
            </div>
          </TabsContent>
        ) : null}
        {sections.hasNonIterables ? (
          <TabsContent
            value="info"
            forceMount
            hidden={activeTab !== 'info'}
            className="w-full h-full"
            data-tour="content-edit-fields"
          >
            <ContentTypeEdit
              key={`info:${form.formRevision}`}
              defaultData={form.draft.current}
              ref={form.nonIterablesRef}
              contentType={sections.nonIterables}
              id={contentTypeName}
              collaborative
            />
          </TabsContent>
        ) : null}
        {sections.hasSeo ? (
          <TabsContent
            value="seo"
            forceMount
            hidden={activeTab !== 'seo'}
            className="w-full h-full"
            data-tour="content-edit-fields"
          >
            <SeoTabContent />
          </TabsContent>
        ) : null}
        {routeLayout.routeLayoutModules.map((layoutModule) => (
          <RouteLayoutModuleTabContent key={layoutModule._id} layoutModule={layoutModule} />
        ))}
        {hasLocaleVariants ? (
          <TabsContent value="variants">
            <ContentVariants />
          </TabsContent>
        ) : null}
        {hasVersioning && contentTypeId ? (
          <TabsContent value="history">
            <VersionHistory
              contentType={contentTypeName}
              documentId={contentTypeId}
              canRestore={canRestoreVersions}
              onRestored={onAfterRestore}
            />
          </TabsContent>
        ) : null}
      </div>
    </ScrollArea>
  )
}
