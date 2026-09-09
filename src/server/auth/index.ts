import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { and, eq } from "drizzle-orm";

import {
  grantsPlatformAdmin,
  isOrganizationRole,
  isPlatformRole,
  PLATFORM_ADMIN_ROLE,
  type OrganizationRole,
  type PlatformRole,
} from "@/config/auth";
import { getAuth, type Session, type User } from "@/lib/auth";
import { createDatabase } from "@/server/db";
import { member as memberTable, organizations } from "@/server/db/schema";
import type { ActorId, OrganizationId } from "@/types";

/**
 * Error thrown when Better Auth authentication or organization context is
 * missing or insufficient for a server-side operation. Safe to render to the
 * client: the message never contains secrets, tokens, or connection strings.
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
  readonly email: string | null;
  readonly name: string | null;
  readonly organizationId: OrganizationId | null;
  readonly organizationRole: OrganizationRole | null;
  readonly organizationSlug: string | null;
  readonly platformRole: PlatformRole;
}

interface MembershipRow {
  organizationId: string;
  organizationSlug: string;
  role: string;
  memberId: string;
}

/**
 * Load the user's membership for one organization directly from the
 * database. This is the server-side membership proof: the active
 * organization is only trusted when a `member` row exists for this exact
 * (user, organization) pair. Browser-supplied organization IDs are never
 * consulted here.
 */
async function loadMembership(
  userId: string,
  organizationId: string,
): Promise<MembershipRow | null> {
  const { client, db } = createDatabase();
  try {
    const [row] = await db
      .select({
        organizationId: organizations.id,
        organizationSlug: organizations.slug,
        role: memberTable.role,
        memberId: memberTable.id,
      })
      .from(memberTable)
      .innerJoin(organizations, eq(memberTable.organizationId, organizations.id))
      .where(
        and(
          eq(memberTable.userId, userId),
          eq(memberTable.organizationId, organizationId),
        ),
      )
      .limit(1);
    return row ?? null;
  } finally {
    await client.end();
  }
}

/** Better Auth roles may be comma-separated multi-role strings. */
function firstApplicationRole(rawRole: string): OrganizationRole | null {
  const primary = rawRole.split(",")[0]?.trim() ?? "";
  return isOrganizationRole(primary) ? primary : null;
}

function toAuthContext(
  session: Session,
  membership: MembershipRow | null,
): AuthContext {
  const user: User = session.user;

  // The session's active organization is only honored when a matching
  // membership row exists (validated server-side above).
  const role = membership ? firstApplicationRole(membership.role) : null;
  const organizationId = membership ? membership.organizationId : null;
  const organizationSlug = membership ? membership.organizationSlug : null;

  const platformRoleValue = (user as { platformRole?: unknown }).platformRole;
  const platformRole: PlatformRole = isPlatformRole(platformRoleValue)
    ? platformRoleValue
    : "user";

  return {
    userId: user.id,
    sessionId: session.session.id ?? null,
    email: user.email ?? null,
    name: user.name ?? null,
    organizationId,
    organizationRole: role,
    organizationSlug,
    platformRole,
  };
}

/**
 * Resolve the raw Better Auth session context for the current request.
 * Returns `null` when there is no authenticated user. All values come from
 * the server-side session (cookie-validated, database-backed); the active
 * organization is additionally confirmed against the `member` table.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null;
  }

  const activeOrganizationId =
    (session.session as { activeOrganizationId?: string | null }).activeOrganizationId ?? null;

  const membership = activeOrganizationId
    ? await loadMembership(session.user.id, activeOrganizationId)
    : null;

  return toAuthContext(session, membership);
}

/**
 * Require an authenticated Better Auth session. Throws
 * {@link AuthContextError} when the request is unauthenticated, so
 * protected Server Actions and Route Handlers fail closed.
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
 * Require an authenticated session with an active organization. The
 * organization is the tenant boundary; the returned `organizationId` is the
 * tenant identifier for tenant-owned rows. The value is resolved server-side
 * from the Better Auth session's active organization AND verified against
 * the `member` membership table. It is never accepted from the browser for
 * authorization.
 *
 * Throws {@link AuthContextError} when unauthenticated or when no
 * organization is active (authenticated users without an organization get
 * the safe empty state via `getTenantContext`-style callers).
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
 * membership role is one of `allowedRoles`. Organization and role are
 * resolved server-side from the Better Auth session and the membership
 * table; the browser cannot influence the check.
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
 * Require an authenticated Better Auth user carrying the database-backed
 * platform role `user.platform_role = "platform_admin"`. Platform-inventory
 * operations are gated solely on this column; organization roles never
 * grant platform-admin access.
 *
 * Throws {@link AuthContextError} with `code="unauthenticated"` when there
 * is no session, or `code="not_platform_admin"` when the user is
 * authenticated but does not carry the role.
 */
export async function requirePlatformAdmin(): Promise<string> {
  const context = await requireAuth();

  if (!grantsPlatformAdmin(context.platformRole)) {
    throw new AuthContextError(
      "not_platform_admin",
      "Platform administrator privileges are required.",
    );
  }

  return context.userId;
}

/**
 * Non-throwing check for the platform-admin role. Used to conditionally
 * render admin navigation; it never authorizes an action (protected
 * operations must call {@link requirePlatformAdmin}).
 */
export async function isCurrentUserPlatformAdmin(): Promise<boolean> {
  const context = await getAuthContext();
  return context ? grantsPlatformAdmin(context.platformRole) : false;
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
 * Platform-inventory operations (imports, batch review) are gated on
 * `user.platform_role`; the active organization is additionally required so
 * the operator can be recorded as the auditing actor (`actors` rows are
 * `(user_id, organization_id)` pairs). Organization roles never grant
 * platform-admin access.
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
 * Combine the Better Auth user with the active organization into a single
 * actor record for server-side handlers and audit logging. Returns `null`
 * when unauthenticated. All fields are resolved server-side.
 */
export async function getCurrentActor(): Promise<CurrentActor | null> {
  const context = await getAuthContext();

  if (!context) {
    return null;
  }

  return {
    actorId: context.userId,
    userId: context.userId,
    organizationId: context.organizationId,
    organizationRole: context.organizationRole,
    organizationSlug: context.organizationSlug,
    email: context.email,
    name: context.name,
  };
}

export { PLATFORM_ADMIN_ROLE };
