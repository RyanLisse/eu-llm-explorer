import { loadExplorerData, type ExplorerData } from "@/services";
import { PageShell } from "./PageShell";

// Turso-backed catalog data should be read at request time when env vars are present.
export const dynamic = "force-dynamic";

const EMPTY_EXPLORER_DATA: ExplorerData = {
  routes: [],
  chains: [],
  providerCoverage: [],
  providerCoverageSummaries: [],
  vendorScope: [],
  multiVendorModels: [],
};

export default async function Page({
  searchParams,
}: {
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const data = tab === "presentation" || tab === "research" ? EMPTY_EXPLORER_DATA : await loadExplorerData();

  return <PageShell data={data} />;
}
