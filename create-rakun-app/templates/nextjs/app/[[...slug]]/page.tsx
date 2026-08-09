import {
  createRakunPageMetadata,
  RakunPageRenderer,
  type RakunNextPageProps,
} from '@rakun-kit/next/web'
import { rakunWeb } from '../../server/web'

type Props = RakunNextPageProps

export const generateStaticParams = rakunWeb.generateStaticParams

const loadPage = async (props: Props) => await rakunWeb.getPageFromProps(props)

export async function generateMetadata(props: Props) {
  return createRakunPageMetadata(await loadPage(props))
}

export default async function Page(props: Props) {
  const page = await loadPage(props)

  return <RakunPageRenderer page={page} loadModule={(name) => import(`../../modules/${name}`)} />
}
