'use client'

import ContentTypeEdit from '../ContentTypeEdit'
import { useEditPageContext } from '../_context/EditPageContext'
import VersionHistory from './Versions'
import { RouteLayoutModuleTabContent } from './RouteLayoutModuleTabContent'
import { LocaleVariants } from './LocaleVariants'

import { TabsContent } from '@/components/ui/tabs'

export const EditTabPanels = () => {
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
  } = useEditPageContext()

  return (
    <div className="min-w-0">
      {sections.hasIterables ? (
        <TabsContent
          value="content"
          forceMount
          hidden={activeTab !== 'content'}
          className="w-full"
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
          />
        </TabsContent>
      ) : null}
      {sections.hasNonIterables ? (
        <TabsContent
          value="info"
          forceMount
          hidden={activeTab !== 'info'}
          className="w-full"
          data-tour="content-edit-fields"
        >
          <ContentTypeEdit
            key={`info:${form.formRevision}`}
            defaultData={form.draft.current}
            ref={form.nonIterablesRef}
            contentType={sections.nonIterables}
            id={contentTypeName}
          />
        </TabsContent>
      ) : null}
      {sections.hasSeo ? (
        <TabsContent
          value="seo"
          forceMount
          hidden={activeTab !== 'seo'}
          className="w-full"
          data-tour="content-edit-fields"
        >
          <ContentTypeEdit
            key={`seo:${form.formRevision}`}
            defaultData={form.draft.current}
            ref={form.seoRef}
            contentType={sections.seo}
            id={contentTypeName}
            hideTitle
          />
        </TabsContent>
      ) : null}
      {routeLayout.routeLayoutModules.map((layoutModule) => (
        <RouteLayoutModuleTabContent key={layoutModule._id} layoutModule={layoutModule} />
      ))}
      {hasLocaleVariants ? (
        <TabsContent value="locale-variants">
          <LocaleVariants />
        </TabsContent>
      ) : null}
      {hasVersioning && contentTypeId ? (
        <TabsContent value="versions">
          <VersionHistory
            contentType={contentTypeName}
            documentId={contentTypeId}
            canRestore={canRestoreVersions}
            onRestored={onAfterRestore}
          />
        </TabsContent>
      ) : null}
    </div>
  )
}
