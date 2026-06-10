import { loadExplorerData } from "@/services";
import { PageShell } from "./PageShell";

// Turso-backed catalog data should be read at request time when env vars are present.
export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await loadExplorerData();

  return <PageShell data={data} />;
}
