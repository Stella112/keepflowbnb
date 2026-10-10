import { getDiscovery } from "../../../lib/binance/rwa";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(await getDiscovery(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Data temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
