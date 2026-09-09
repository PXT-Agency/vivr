import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";

import {
  organizationAccessControl,
  organizationRoles,
} from "@/config/auth";
import { getAuthEnv, getDatabaseEnv } from "@/lib/env";
import { createDatabase } from "@/server/db";
import {
  account,
  invitation,
  member,
  organizations,
  session,
  user,
  verification,
} from "@/server/db/schema";

/**
 * Centralized Better Auth server instance.
 *
 * - Self-hosted in the application's own PostgreSQL database via the
 *   official Drizzle adapter (`@better-auth/drizzle-adapter`, provider "pg").
 * - Email/password authentication for local development and the pilot.
 * - The `organization()` plugin is the canonical organization system:
 *   memberships, roles, invitations, and the server-side active organization
 *   (`session.active_organization_id`). The adapter uses `usePlural: false`
 *   so schema keys (singular) match the internal Better Auth model names.
 * - `BETTER_AUTH_SECRET` is validated at this boundary and never exposed to
 *   the browser.
 * - `nextCookies()` is the last plugin so Server Actions can set cookies.
 *
 * No authentication logic belongs in React components; pages and actions use
 * the server helpers in `src/server/auth`.
 */

function initAuth() {
  const { BETTER_AUTH_SECRET, BETTER_AUTH_URL } = getAuthEnv();
  void getDatabaseEnv();

  return betterAuth({
    secret: BETTER_AUTH_SECRET,
    baseURL: BETTER_AUTH_URL,
    database: drizzleAdapter(createDatabase().db, {
      provider: "pg",
      usePlural: false,
      schema: {
        user,
        session,
        account,
        verification,
        organization: organizations,
        member,
        invitation,
      },
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    user: {
      additionalFields: {
        platformRole: {
          type: "string",
          required: false,
          defaultValue: "user",
          input: false,
        },
      },
    },
    plugins: [
      organization({
        ac: organizationAccessControl,
        roles: organizationRoles,
        creatorRole: "org:admin",
        allowUserToCreateOrganization: true,
      }),
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof initAuth>;

let cached: Auth | null = null;

/**
 * Get the Better Auth instance (cached per server process). Never import
 * this module from client components.
 */
export function getAuth(): Auth {
  if (!cached) {
    cached = initAuth();
  }
  return cached;
}

/**
 * Server-side auth API convenience accessor. Call as
 * `auth.api.getSession({ headers: await headers() })`.
 */
export function auth(): Auth["api"] {
  return getAuth().api;
}

/** Inferred session type (user + session, including organization fields). */
export type Session = Auth["$Infer"]["Session"];
/** Inferred Better Auth user type (including `platformRole`). */
export type User = Session["user"];
