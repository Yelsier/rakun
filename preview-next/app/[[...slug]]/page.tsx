import {
  createRakunGenerateStaticParams,
  createRakunPageMetadata,
  getRakunPageFromProps,
  RakunPageRenderer,
  type RakunNextPageProps,
} from '@rakun-kit/next/web'
import { getPreviewApiBaseUrl } from '../../server/web-config'

type Props = RakunNextPageProps

const apiBaseUrl = getPreviewApiBaseUrl()

export const generateStaticParams = createRakunGenerateStaticParams({
  apiBaseUrl,
})

export async function generateMetadata(props: Props) {
  const page = await getRakunPageFromProps(props, { apiBaseUrl })

  return createRakunPageMetadata(page)
}

export default async function Page(props: Props) {
  const page = await getRakunPageFromProps(props, { apiBaseUrl })

  return <RakunPageRenderer page={page} loadModule={(name) => import(`../../modules/${name}`)} />
}
