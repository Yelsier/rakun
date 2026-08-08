import {
  createRakunManagerMetadata,
  RakunManagerPage,
  type RakunManagerPageProps,
} from '@rakun-kit/next/manager'

import { PreviewManager } from './preview-manager'

export const metadata = createRakunManagerMetadata()

export default function BackendPage(props: RakunManagerPageProps) {
  return (
    <RakunManagerPage
      {...props}
      basePath="/backend"
      apiBaseUrl="/api"
      preview={{ webBaseUrl: '/rakun-preview' }}
      managerComponent={PreviewManager}
    />
  )
}
