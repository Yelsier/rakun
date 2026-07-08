import ListContents from './list'

export const ManagerContentTypeListScreen = ({
  contentType,
  fields,
  documentVisibility,
  hasPageRoutes,
}: {
  title?: string
  contentType: string
  fields?: string[]
  documentVisibility?: boolean
  hasPageRoutes?: boolean
}) => (
  <ListContents
    contentType={contentType}
    fields={fields}
    documentVisibility={documentVisibility}
    hasPageRoutes={hasPageRoutes}
  />
)
