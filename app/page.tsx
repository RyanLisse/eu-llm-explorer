import { loadExplorerData } from "@/services";
import { PageShell } from "./PageShell";

// Turso-backed catalog data should be read at request time when env vars are present.
export const dynamic = "force-dynamic";

export default async function Page() {
  let data;
  try {
    data = await loadExplorerData();
  } catch (e) {
    console.error("[page] loadExplorerData failed:", e);
    throw e;
  }

  return <PageShell data={data} />;
}
