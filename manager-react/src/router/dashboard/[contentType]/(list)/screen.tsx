import ListContents from './list'

export const ManagerContentTypeListScreen = ({
  contentType,
  fields,
}: {
  title?: string
  contentType: string
  fields?: string[]
}) => <ListContents contentType={contentType} fields={fields} />
