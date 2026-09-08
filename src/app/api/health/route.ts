import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Health check. Returns `{ ok: true }` so load balancers and monitors can
 * confirm the process is alive. Database reachability is reported through the
 * database-boundary environment validator, not here, so this endpoint never
 * degrades the application liveness signal.
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
