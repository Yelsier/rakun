import {
  getRakunPage,
  getRakunPathFromParams,
  type RakunNextPageParams,
  type RakunNextPageSearchParams,
} from "@rakun-kit/next/web";
import { RakunPageClient } from "./RakunPageClient";

type Props = {
  params: Promise<RakunNextPageParams>;
  searchParams: Promise<RakunNextPageSearchParams>;
};

export default async function Page({ params, searchParams }: Props) {
  const page = await getRakunPage({
    path: getRakunPathFromParams({ params: await params }),
    search: await searchParams,
    apiBaseUrl: "/api",
  });

  return <RakunPageClient page={page} />;
}
