import {
  createRakunPageMetadata,
  getRakunPage,
  getRakunPathFromParams,
  RakunPageRenderer,
  type RakunNextPageParams,
  type RakunNextPageSearchParams,
} from '@rakun-kit/next/web'

type Props = {
  params: Promise<RakunNextPageParams>
  searchParams: Promise<RakunNextPageSearchParams>
}

const loadPage = async ({ params, searchParams }: Props) =>
  getRakunPage({
    path: getRakunPathFromParams({ params: await params }),
    search: await searchParams,
    apiBaseUrl: '/api/rakun',
  })

export async function generateMetadata(props: Props) {
  return createRakunPageMetadata(await loadPage(props))
}

export default async function Page(props: Props) {
  const page = await loadPage(props)

  return <RakunPageRenderer page={page} loadModule={(name) => import(`../../modules/${name}`)} />
}
