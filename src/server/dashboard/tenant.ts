import {
  AuthContextError,
  requireOrganizationRole,
} from "@/server/auth";
import {
  ORGANIZATION_ROLES,
  type OrganizationRole,
} from "@/config/auth";
import {
  isStarNumberCategory,
  isStarNumberStatus,
  STAR_NUMBER_CATEGORIES,
  type StarNumberCategory,
  type StarNumberStatus,
} from "@/config/starNumbers";
import { createDatabase } from "@/server/db";
import { createOrganizationRepository } from "@/server/repositories/organizations";
import { createStarNumberRepository } from "@/server/repositories/star-numbers";

export const STAR_LIST_PAGE_SIZE = 25;

/**
 * Roles allowed to view the tenant dashboard. Any organization member with a
 * recognized role may view their own tenant's dashboard; this gate exists so
 * unrecognized roles are rejected and future viewer-only role restrictions
 * have a single place to be tightened.
 */
export const TENANT_VIEWER_ROLES: readonly OrganizationRole[] = ORGANIZATION_ROLES;

export interface TenantContext {
  organizationId: string;
  organizationSlug: string;
  organizationRole: OrganizationRole;
}

/**
 * Resolve the authenticated tenant context from the Clerk session. Returns
 * `null` when the user is signed in but has no active organization (the UI
 * shows a "select an organization" state). Never accepts an organization id
 * from the client.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  try {
    const organization = await requireOrganizationRole([...TENANT_VIEWER_ROLES]);
    return {
      organizationId: organization.organizationId,
      organizationSlug: organization.organizationSlug,
      organizationRole: organization.organizationRole,
    };
  } catch (error) {
    if (error instanceof AuthContextError && error.code === "missing_organization") {
      return null;
    }
    throw error;
  }
}

export interface DashboardOverview {
  context: TenantContext;
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
  starNumbers: {
    total: number;
    byCategory: Record<StarNumberCategory, number>;
  };
}

/**
 * Workspace overview: tenant context plus read-only platform-inventory
 * counts. Star numbers are platform-level (no tenant ownership columns exist
 * yet), so counts are labeled "platform inventory" by the UI.
 */
export async function getDashboardOverview(): Promise<DashboardOverview | null> {
  const context = await getTenantContext();
  if (!context) return null;

  const { client, db } = createDatabase();
  try {
    const orgRepo = createOrganizationRepository(db);
    const starRepo = createStarNumberRepository(db);

    const [organization, counts] = await Promise.all([
      orgRepo.findById(context.organizationId),
      Promise.all(
        STAR_NUMBER_CATEGORIES.map(async (category) => ({
          category,
          count: (await starRepo.count({ category })).total,
        })),
      ),
    ]);

    const byCategory = Object.fromEntries(
      counts.map(({ category, count }) => [category, count]),
    ) as Record<StarNumberCategory, number>;

    return {
      context,
      organization: organization
        ? { id: organization.id, name: organization.name, slug: organization.slug }
        : null,
      starNumbers: {
        total: Object.values(byCategory).reduce((sum, count) => sum + count, 0),
        byCategory,
      },
    };
  } finally {
    await client.end();
  }
}

export interface StarNumberListingFilters {
  search: string;
  category: StarNumberCategory | null;
  status: StarNumberStatus | null;
}

export interface StarNumberListing {
  context: TenantContext;
  stars: Array<{
    id: string;
    displayNumber: string;
    numberCode: string;
    category: StarNumberCategory;
    status: StarNumberStatus;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: StarNumberListingFilters;
}

export interface StarNumberListingParams {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
}

const SEARCH_MAX_LENGTH = 12;

/**
 * Read-only, paginated star-number inventory for the tenant dashboard. The
 * catalog is platform-level today, so listing applies no tenant filter (there
 * are no ownership columns yet); the page is explicitly labeled "platform
 * inventory" to avoid implying ownership.
 */
export async function getStarNumberListing(
  params: StarNumberListingParams = {},
): Promise<StarNumberListing | null> {
  const context = await getTenantContext();
  if (!context) return null;

  const search = (params.search ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
  const category = isStarNumberCategory(params.category) ? params.category : null;
  const status = isStarNumberStatus(params.status) ? params.status : null;

  const pageSize = STAR_LIST_PAGE_SIZE;
  const page = Number.isFinite(params.page) && (params.page ?? 0) > 0 ? (params.page as number) : 1;

  const { client, db } = createDatabase();
  try {
    const starRepo = createStarNumberRepository(db);

    const [rows, counts] = await Promise.all([
      starRepo.list({
        search: search || undefined,
        category: category ?? undefined,
        status: status ?? undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      starRepo.count({
        search: search || undefined,
        category: category ?? undefined,
        status: status ?? undefined,
      }),
    ]);

    const total = counts.filtered;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);

    return {
      context,
      stars: rows.map((row) => ({
        id: row.id,
        displayNumber: row.displayNumber,
        numberCode: row.numberCode,
        category: row.category as StarNumberCategory,
        status: row.status as StarNumberStatus,
      })),
      total,
      page: currentPage,
      pageSize,
      totalPages,
      filters: { search, category, status },
    };
  } finally {
    await client.end();
  }
}