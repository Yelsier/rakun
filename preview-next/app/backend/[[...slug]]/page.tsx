import { RakunManagerPage, RakunManagerPageProps } from '@rakun-kit/next/manager'

export default function BackendPage(props: RakunManagerPageProps) {
  return (
    <RakunManagerPage
      {...props}
      basePath="/backend"
      apiBaseUrl="/api"
      preview={{ webBaseUrl: '/' }}
    />
  )
}
