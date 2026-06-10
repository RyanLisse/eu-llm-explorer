import { loadExplorerData } from "@/services";

export async function GET() {
  const rawUrl = process.env.TURSO_DATABASE_URL ?? "(not set)";
  const hasToken = !!process.env.TURSO_AUTH_TOKEN;
  // Show only scheme+host, never expose the auth token
  let parsedUrl: string;
  try {
    const normalized = rawUrl.replace(/^libsql:\/\//, "https://");
    parsedUrl = new URL(normalized).origin;
  } catch {
    parsedUrl = `INVALID: first 40 chars = "${rawUrl.slice(0, 40)}"`;
  }

  try {
    const data = await loadExplorerData();
    return Response.json({ ok: true, routeCount: data.routes.length, dbUrl: parsedUrl, hasToken });
  } catch (e) {
    return Response.json(
      { error: String(e), dbUrl: parsedUrl, hasToken, stack: e instanceof Error ? e.stack : undefined },
      { status: 500 },
    );
  }
}
