import ListContents from './list'

export const ManagerContentTypeListScreen = ({
  contentType,
  fields,
  documentVisibility,
}: {
  title?: string
  contentType: string
  fields?: string[]
  documentVisibility?: boolean
}) => (
  <ListContents
    contentType={contentType}
    fields={fields}
    documentVisibility={documentVisibility}
  />
)
