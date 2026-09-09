import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Next.js 16 proxy (middleware replacement).
 *
 * Performs ONLY a lightweight session-cookie existence check and redirects
 * unauthenticated-looking document requests to /sign-in, per Better Auth's
 * Next.js guidance (no database calls in the proxy). This is an optimistic
 * UX gate, NOT the security boundary: the cookie is not validated here.
 * Every protected page, loader, server action, and route handler
 * independently validates the session via the Better Auth-backed server
 * helpers in `src/server/auth`.
 *
 * Protected: /dashboard*, /admin*, /api/actor*, /api/admin*.
 * Public: /, /sign-in, /sign-up, /api/auth/*, /api/health.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  const { pathname } = request.nextUrl;

  const isProtectedApi =
    pathname.startsWith("/api/actor") || pathname.startsWith("/api/admin");

  if (!sessionCookie) {
    if (isProtectedApi) {
      // API routes must return JSON 401, never an HTML redirect.
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/actor/:path*",
    "/api/admin/:path*",
  ],
};
