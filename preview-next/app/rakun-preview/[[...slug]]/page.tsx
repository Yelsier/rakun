import {
  getRakunPage,
  getRakunPathFromParams,
  RakunPageRenderer,
  type RakunNextPageParams,
  type RakunNextPageSearchParams,
} from '@rakun-kit/next/web'

import { getPreviewApiBaseUrl } from '../../../server/web-config'

type Props = {
  params: Promise<RakunNextPageParams>
  searchParams: Promise<RakunNextPageSearchParams>
}

export const dynamic = 'force-dynamic'
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function PreviewPage({ params, searchParams }: Props) {
  const page = await getRakunPage({
    path: getRakunPathFromParams({ params: await params }),
    search: await searchParams,
    apiBaseUrl: getPreviewApiBaseUrl(),
  })

  return <RakunPageRenderer page={page} loadModule={(name) => import(`../../../modules/${name}`)} />
}
