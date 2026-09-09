import { desc, eq } from "drizzle-orm";

import type { OrganizationId } from "@/types";
import type { Db } from "@/server/db";
import { organizations, type OrganizationRow } from "@/server/db/schema";

export interface OrganizationUpsert {
  id: OrganizationId;
  name: string;
  slug: string;
}

/**
 * Application-side mirror of Clerk organization metadata. The Clerk
 * organization ID is the tenant boundary and the primary key; values are
 * resolved server-side from the Clerk session, never from the browser.
 */
export class OrganizationRepository {
  constructor(private readonly db: Db) {}

  /**
   * Upsert the app-side organization mirror. Keeps the local profile in sync
   * with Clerk across webhooks/session refreshes without violating any
   * constraint (id, slug unique).
   */
  async upsert(input: OrganizationUpsert): Promise<OrganizationRow> {
    const [row] = await this.db
      .insert(organizations)
      .values({
        id: input.id,
        name: input.name,
        slug: input.slug,
      })
      .onConflictDoUpdate({
        target: organizations.id,
        set: {
          name: input.name,
          slug: input.slug,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  async findById(organizationId: OrganizationId): Promise<OrganizationRow | null> {
    const [row] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    return row ?? null;
  }

  async findBySlug(slug: string): Promise<OrganizationRow | null> {
    const [row] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);
    return row ?? null;
  }

  async list(): Promise<OrganizationRow[]> {
    return this.db.select().from(organizations).orderBy(desc(organizations.createdAt));
  }

  async deleteById(organizationId: OrganizationId): Promise<void> {
    await this.db.delete(organizations).where(eq(organizations.id, organizationId));
  }
}

export type OrganizationsRepository = OrganizationRepository;

/**
 * Factory that binds the repository to a Drizzle query client. The raw
 * PostgreSQL client is never exposed outside the database module.
 */
export function createOrganizationRepository(db: Db): OrganizationsRepository {
  return new OrganizationRepository(db);
}