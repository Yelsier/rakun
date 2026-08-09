import {
  createRakunPageMetadata,
  RakunPageRenderer,
  type RakunNextPageProps,
} from '@rakun-kit/next/web'
import { previewWeb } from '../../server/web'

type Props = RakunNextPageProps

export const generateStaticParams = previewWeb.generateStaticParams

export async function generateMetadata(props: Props) {
  const page = await previewWeb.getPageFromProps(props)

  return createRakunPageMetadata(page)
}

export default async function Page(props: Props) {
  const page = await previewWeb.getPageFromProps(props)

  return <RakunPageRenderer page={page} loadModule={(name) => import(`../../modules/${name}`)} />
}
