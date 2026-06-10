import { createClient } from "@libsql/client/web";
import { loadExplorerData } from "@/services";

export async function GET() {
  const rawUrl = process.env.TURSO_DATABASE_URL ?? "(not set)";
  const hasToken = !!process.env.TURSO_AUTH_TOKEN;
  const normalizedUrl = rawUrl.replace(/^libsql:\/\//, "https://");

  // Direct createClient test — bypass turso.ts to isolate the issue
  let directTest: string;
  try {
    const client = createClient({ url: normalizedUrl, authToken: process.env.TURSO_AUTH_TOKEN });
    const r = await client.execute("SELECT COUNT(*) as c FROM model_routes");
    client.close();
    directTest = `OK: ${r.rows[0].c} rows`;
  } catch (e) {
    directTest = `FAIL: ${String(e)}`;
  }

  try {
    const data = await loadExplorerData();
    return Response.json({ ok: true, routeCount: data.routes.length, normalizedUrl, hasToken, directTest });
  } catch (e) {
    return Response.json(
      { error: String(e), normalizedUrl, hasToken, directTest },
      { status: 500 },
    );
  }
}
