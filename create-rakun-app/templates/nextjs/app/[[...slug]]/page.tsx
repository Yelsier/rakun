import {
  createRakunGenerateStaticParams,
  createRakunPageMetadata,
  getRakunPageFromProps,
  RakunPageRenderer,
  type RakunNextPageProps,
} from '@rakun-kit/next/web'
import { getRakunApiBaseUrl } from '../../server/web-config'

type Props = RakunNextPageProps

const apiBaseUrl = getRakunApiBaseUrl()

export const generateStaticParams = createRakunGenerateStaticParams({
  apiBaseUrl,
})

const loadPage = async (props: Props) => getRakunPageFromProps(props, { apiBaseUrl })

export async function generateMetadata(props: Props) {
  return createRakunPageMetadata(await loadPage(props))
}

export default async function Page(props: Props) {
  const page = await loadPage(props)

  return <RakunPageRenderer page={page} loadModule={(name) => import(`../../modules/${name}`)} />
}
