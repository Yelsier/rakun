import {
  createRakunPageMetadata,
  getRakunPage,
  getRakunPathFromParams,
  RakunPageRenderer,
  type RakunNextPageParams,
  type RakunNextPageSearchParams,
} from "@rakun-kit/next/web";

type Props = {
  params: Promise<RakunNextPageParams>;
  searchParams: Promise<RakunNextPageSearchParams>;
};

export async function generateMetadata({ params, searchParams }: Props) {
  const page = await getRakunPage({
    path: getRakunPathFromParams({ params: await params }),
    search: await searchParams,
    apiBaseUrl: "/api",
  });

  return createRakunPageMetadata(page);
}

export default async function Page({ params, searchParams }: Props) {
  const page = await getRakunPage({
    path: getRakunPathFromParams({ params: await params }),
    search: await searchParams,
    apiBaseUrl: "/api",
  });

  return (
    <RakunPageRenderer
      page={page}
      loadModule={(name) => import(`../../modules/${name}`)}
    />
  );
}
