import { loadExplorerData } from "@/services";

export async function GET() {
  try {
    const data = await loadExplorerData();
    return Response.json({ ok: true, routeCount: data.routes.length });
  } catch (e) {
    return Response.json(
      { error: String(e), stack: e instanceof Error ? e.stack : undefined },
      { status: 500 },
    );
  }
}
