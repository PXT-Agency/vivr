import { and, eq } from "drizzle-orm";

import type { ActorId, OrganizationId } from "@/types";
import type { Db } from "@/server/db";
import { actors, type ActorRow, type NewActorRow } from "@/server/db/schema";

export interface ActorInput {
  userId: string;
  organizationId: OrganizationId;
}

/**
 * Application-level actors: a user acting within an organization. The
 * (user_id, organization_id) pair is unique; a user is a distinct actor per
 * organization membership. Used as the audit identity for platform operations
 * (e.g. import batches run by operators).
 */
export class ActorRepository {
  constructor(private readonly db: Db) {}

  async create(input: ActorInput): Promise<ActorRow> {
    const [row] = await this.db.insert(actors).values(input).returning();
    return row;
  }

  async upsert(input: ActorInput): Promise<ActorRow> {
    const existing = await this.findByUserAndOrganization(input.userId, input.organizationId);
    if (existing) return existing;

    const [row] = await this.db
      .insert(actors)
      .values(input)
      .onConflictDoNothing({ target: [actors.userId, actors.organizationId] })
      .returning();
    // The conflict target is a unique index, so the race-safe path is handled.
    return row ?? (await this.requireByUserAndOrganization(input.userId, input.organizationId));
  }

  async findById(actorId: ActorId): Promise<ActorRow | null> {
    const [row] = await this.db.select().from(actors).where(eq(actors.id, actorId)).limit(1);
    return row ?? null;
  }

  async findByUserAndOrganization(
    userId: string,
    organizationId: OrganizationId,
  ): Promise<ActorRow | null> {
    const [row] = await this.db
      .select()
      .from(actors)
      .where(and(eq(actors.userId, userId), eq(actors.organizationId, organizationId)))
      .limit(1);
    return row ?? null;
  }

  async requireByUserAndOrganization(
    userId: string,
    organizationId: OrganizationId,
  ): Promise<ActorRow> {
    const row = await this.findByUserAndOrganization(userId, organizationId);
    if (!row) {
      throw new Error(
        `Actor not found for user ${userId} in organization ${organizationId}`,
      );
    }
    return row;
  }

  async listByOrganization(organizationId: OrganizationId): Promise<ActorRow[]> {
    return this.db
      .select()
      .from(actors)
      .where(eq(actors.organizationId, organizationId));
  }

  async listByUser(userId: string): Promise<ActorRow[]> {
    return this.db.select().from(actors).where(eq(actors.userId, userId));
  }

  async deleteById(actorId: ActorId): Promise<void> {
    await this.db.delete(actors).where(eq(actors.id, actorId));
  }
}

export type ActorsRepository = ActorRepository;

export function createActorRepository(db: Db): ActorsRepository {
  return new ActorRepository(db);
}

export type { NewActorRow as NewActor, ActorRow as Actor };