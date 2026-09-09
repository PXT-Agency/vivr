import { NextResponse } from "next/server";

import { getCurrentActor } from "@/server/auth";

export const dynamic = "force-dynamic";

/**
 * Returns the current actor (user + active organization) for authenticated
 * requests. Demonstrates the server-side auth pattern all protected Route
 * Handlers and Server Actions must follow: identity and organization are
 * resolved from the Clerk session, never from the request body or headers.
 */
export async function GET() {
  const actor = await getCurrentActor();

  if (!actor) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  return NextResponse.json({ actor });
}
