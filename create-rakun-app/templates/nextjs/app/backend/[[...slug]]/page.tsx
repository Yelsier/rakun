import { RakunManagerPage, type RakunManagerPageProps } from '@rakun-kit/next/manager'

export default function BackendPage(props: RakunManagerPageProps) {
  return (
    <RakunManagerPage
      {...props}
      apiBaseUrl="/api/rakun"
      basePath="/backend"
      preview={{ webBaseUrl: '/' }}
    />
  )
}
