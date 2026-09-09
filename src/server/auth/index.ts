import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

import {
  isOrganizationRole,
  isPlatformAdmin,
  type OrganizationRole,
} from "@/config/auth";
import type { ActorId, OrganizationId } from "@/types";

/**
 * Error thrown when Clerk authentication or organization context is missing
 * or insufficient for a server-side operation. Safe to render to the client:
 * the message never contains secrets, tokens, or connection strings.
 */
export class AuthContextError extends Error {
  readonly code:
    | "unauthenticated"
    | "missing_organization"
    | "insufficient_role"
    | "not_platform_admin"
    | "unknown";

  constructor(
    code: AuthContextError["code"],
    message: string,
  ) {
    super(message);
    this.name = "AuthContextError";
    this.code = code;
  }
}

export interface AuthContext {
  readonly userId: string;
  readonly sessionId: string | null;
  readonly organizationId: OrganizationId | null;
  readonly organizationRole: OrganizationRole | null;
  readonly organizationSlug: string | null;
}

/**
 * Resolve the raw Clerk session context for the current request. Returns
 * `null` when there is no authenticated user. All values come from the
 * server-side Clerk session; browser-supplied identifiers are never read.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const { userId, sessionId, orgId, orgRole, orgSlug, isAuthenticated } =
    await auth();

  if (!isAuthenticated || !userId) {
    return null;
  }

  return {
    userId,
    sessionId: sessionId ?? null,
    organizationId: (orgId as OrganizationId | null) ?? null,
    organizationRole: isOrganizationRole(orgRole) ? orgRole : null,
    organizationSlug: orgSlug ?? null,
  };
}

/**
 * Require an authenticated Clerk session. Throws {@link AuthContextError}
 * when the request is unauthenticated, so protected Server Actions and Route
 * Handlers fail closed.
 */
export async function requireAuth(): Promise<AuthContext> {
  const context = await getAuthContext();

  if (!context) {
    throw new AuthContextError(
      "unauthenticated",
      "Authentication required. Sign in to continue.",
    );
  }

  return context;
}

export interface OrganizationContext extends AuthContext {
  readonly organizationId: OrganizationId;
  readonly organizationRole: OrganizationRole;
  readonly organizationSlug: string;
}

/**
 * Require an authenticated session with an active Clerk Organization. Clerk
 * Organizations are the tenant boundary; the returned `organizationId` is the
 * external tenant identifier for tenant-owned rows in future phases. The value
 * is resolved server-side from the session and must never be accepted from
 * the browser for authorization.
 *
 * Throws {@link AuthContextError} when unauthenticated or when no organization
 * is active.
 */
export async function requireOrganization(): Promise<OrganizationContext> {
  const context = await requireAuth();

  if (
    !context.organizationId ||
    !context.organizationRole ||
    context.organizationSlug === null
  ) {
    throw new AuthContextError(
      "missing_organization",
      "An active organization is required. Select or create an organization to continue.",
    );
  }

  return {
    ...context,
    organizationId: context.organizationId,
    organizationRole: context.organizationRole,
    organizationSlug: context.organizationSlug,
  };
}

/**
 * Require an authenticated session with an active organization whose
 * membership role is one of `allowedRoles`. Organization and role are resolved
 * server-side from the Clerk session; the browser cannot influence the check.
 *
 * Throws {@link AuthContextError} with `code="insufficient_role"` when the
 * current membership role is not allowed.
 */
export async function requireOrganizationRole(
  allowedRoles: readonly OrganizationRole[],
): Promise<OrganizationContext> {
  const organization = await requireOrganization();

  if (!allowedRoles.includes(organization.organizationRole)) {
    throw new AuthContextError(
      "insufficient_role",
      "Your organization role does not permit this action.",
    );
  }

  return organization;
}

export interface CurrentActor {
  readonly actorId: ActorId;
  readonly userId: string;
  readonly organizationId: OrganizationId | null;
  readonly organizationRole: OrganizationRole | null;
  readonly organizationSlug: string | null;
  readonly email: string | null;
  readonly name: string | null;
}

/**
 * Require an authenticated Clerk user carrying the platform-administrator
 * public-metadata flag (`data.platformAdmin: true`). Platform-inventory
 * operations are gated solely on this flag; organization roles never grant
 * platform-admin access.
 *
 * Throws {@link AuthContextError} with `code="unauthenticated"` when there is
 * no session, or `code="not_platform_admin"` when the user is authenticated
 * but does not carry the flag.
 */
export async function requirePlatformAdmin(): Promise<string> {
  const context = await requireAuth();
  const user = await currentUser();

  if (!context || !user) {
    throw new AuthContextError(
      "unauthenticated",
      "Authentication required to manage platform inventory.",
    );
  }

  if (!isPlatformAdmin(user.publicMetadata)) {
    throw new AuthContextError(
      "not_platform_admin",
      "Platform administrator privileges are required.",
    );
  }

  return context.userId;
}

/**
 * Non-throwing check for the platform-administrator public-metadata flag.
 * Used to conditionally render admin navigation; it never authorizes an
 * action (protected operations must call {@link requirePlatformAdmin}).
 */
export async function isCurrentUserPlatformAdmin(): Promise<boolean> {
  const user = await currentUser();
  return user ? isPlatformAdmin(user.publicMetadata) : false;
}

export interface PlatformAdminContext {
  readonly userId: string;
  readonly organizationId: OrganizationId;
  readonly organizationRole: OrganizationRole;
  readonly organizationSlug: string;
}

/**
 * Require a platform administrator with an active organization context.
 *
 * Platform-inventory operations (imports, batch review) are gated on the
 * platform-administrator flag; the active organization is additionally
 * required so the operator can be recorded as the auditing actor
 * (`actors` rows are `(user_id, organization_id)` pairs). Organization roles
 * never grant platform-admin access.
 *
 * Throws {@link AuthContextError} with `code="unauthenticated"`,
 * `code="not_platform_admin"`, or `code="missing_organization"`.
 */
export async function requirePlatformAdminContext(): Promise<PlatformAdminContext> {
  const userId = await requirePlatformAdmin();
  const organization = await requireOrganization();
  return {
    userId,
    organizationId: organization.organizationId,
    organizationRole: organization.organizationRole,
    organizationSlug: organization.organizationSlug,
  };
}

/**
 * Convert an {@link AuthContextError} raised by `requirePlatformAdminContext`
 * into an HTTP response. Unknown errors are re-thrown so they surface as 500s.
 */
export function platformAdminErrorResponse(error: unknown): NextResponse {
  if (error instanceof Error && "code" in error) {
    const code = (error as { code: string }).code;
    if (code === "unauthenticated") {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (code === "not_platform_admin") {
      return NextResponse.json(
        { error: "not_platform_admin" },
        { status: 403 },
      );
    }
    if (code === "missing_organization") {
      return NextResponse.json(
        { error: "missing_organization" },
        { status: 400 },
      );
    }
  }
  throw error;
}

/**
 * Combine the Clerk user with the active organization into a single actor
 * record for server-side handlers and future audit logging. Returns `null`
 * when unauthenticated. All fields are resolved server-side.
 */
export async function getCurrentActor(): Promise<CurrentActor | null> {
  const [context, user] = await Promise.all([
    getAuthContext(),
    currentUser(),
  ]);

  if (!context || !user) {
    return null;
  }

  const primaryEmail = user.emailAddresses.find(
    (emailAddress) => emailAddress.id === user.primaryEmailAddressId,
  );

  return {
    actorId: user.id,
    userId: context.userId,
    organizationId: context.organizationId,
    organizationRole: context.organizationRole,
    organizationSlug: context.organizationSlug,
    email: primaryEmail?.emailAddress ?? null,
    name: user.fullName ?? user.username ?? null,
  };
}
