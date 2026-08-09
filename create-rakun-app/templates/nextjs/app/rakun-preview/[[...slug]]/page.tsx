import {
  getRakunPathFromParams,
  RakunPageRenderer,
  type RakunNextPageParams,
  type RakunNextPageSearchParams,
} from '@rakun-kit/next/web'

import { rakunWeb } from '../../../server/web'

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
  const page = await rakunWeb.getPage({
    path: getRakunPathFromParams({ params: await params }),
    search: await searchParams,
  })

  return <RakunPageRenderer page={page} loadModule={(name) => import(`../../../modules/${name}`)} />
}
