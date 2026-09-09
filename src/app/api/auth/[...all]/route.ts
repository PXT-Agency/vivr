import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

/**
 * Better Auth catch-all route handler. Exposes all required auth endpoints
 * (sign-up, sign-in, sign-out, session retrieval, organization plugin
 * endpoints) under /api/auth/*.
 */
export const { GET, POST } = toNextJsHandler(getAuth());
