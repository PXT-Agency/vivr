import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createActorRepository } from "@/server/repositories/actors";
import { createOrganizationRepository } from "@/server/repositories/organizations";
import { createVivrRepository } from "@/server/repositories/vivrs";
import { createVivrVersionRepository } from "@/server/repositories/vivr-versions";
import { connectTestDatabase, resetDatabase, type TestDatabase } from "@/server/db/testing";
import { createVivrService } from "@/server/services/vivr/vivrService";
import { parseVivrConfig } from "@/server/services/vivr/schemas";
import type { VivrConfig } from "@/types/vivr";

const ACTOR = { userId: "user_vivr_test", organizationId: "org_vivr_test" };

let testDb: TestDatabase;
let vivrService: ReturnType<typeof createVivrService>;
let vivrRepo: ReturnType<typeof createVivrRepository>;
let versionRepo: ReturnType<typeof createVivrVersionRepository>;
let actorId: string;

beforeAll(() => {
  testDb = connectTestDatabase();
  vivrService = createVivrService(testDb.db);
  vivrRepo = createVivrRepository(testDb.db);
  versionRepo = createVivrVersionRepository(testDb.db);
});

beforeEach(async () => {
  await resetDatabase(testDb);
  await createOrganizationRepository(testDb.db).upsert({
    id: ACTOR.organizationId,
    name: "VIVR Test Org",
    slug: "vivr-test-org",
  });
  actorId = (await createActorRepository(testDb.db).upsert(ACTOR)).id;
});

afterAll(async () => {
  await testDb.close();
});

function linkBlock(overrides: Record<string, unknown> = {}) {
  return { type: "link", title: "Hotline", config: { url: "https://example.com/hotline" }, ...overrides };
}

describe("VivrService", () => {
  it("creates a VIVR with a structurally valid empty draft (sequence 1)", async () => {
    const { vivr, draft } = await vivrService.createVivr("org_vivr_test", {
      title: "County Emergency",
      slug: "County Emergency ",
      description: "Public info",
      brandColor: "#123456",
    });

    expect(vivr.slug).toBe("county-emergency"); // normalized
    expect(vivr.brandColor).toBe("#123456");
    expect(draft.sequence).toBe(1);
    expect(draft.publishedAt).toBeNull();

    const list = await vivrRepo.listForOrganization("org_vivr_test");
    expect(list).toHaveLength(1);
    expect(list[0].draftSequence).toBe(1);
    expect(list[0].publishedSequence).toBeNull();
  });

  it("rejects duplicate slug across VIVRs", async () => {
    await vivrService.createVivr("org_vivr_test", { title: "A", slug: "same-slug" });
    await expect(
      vivrService.createVivr("org_vivr_test", { title: "B", slug: "same-slug" }),
    ).rejects.toThrow(/already taken/i);
  });

  it("adds, edits, reorders, duplicates and toggles blocks", async () => {
    const { vivr } = await vivrService.createVivr("org_vivr_test", {
      title: "Emergency",
      slug: "emergency",
    });

    const added = await vivrService.addBlock("org_vivr_test", vivr.id, linkBlock());
    expect(added.type).toBe("link");

    await vivrService.addBlock("org_vivr_test", vivr.id, {
      ...linkBlock({ title: "Second" }),
      type: "call",
      config: { phone: "+254700000000" },
    });

    let config = await currentConfig(vivr.id);
    expect(config.blocks.map((block) => block.title)).toEqual(["Hotline", "Second"]);

    await vivrService.moveBlock("org_vivr_test", vivr.id, added.id, "down");
    config = await currentConfig(vivr.id);
    expect(config.blocks.map((block) => block.title)).toEqual(["Second", "Hotline"]);

    await vivrService.setBlockEnabled("org_vivr_test", vivr.id, added.id, false);
    config = await currentConfig(vivr.id);
    expect(config.blocks.find((block) => block.id === added.id)?.enabled).toBe(false);

    await vivrService.duplicateBlock("org_vivr_test", vivr.id, added.id);
    config = await currentConfig(vivr.id);
    expect(config.blocks).toHaveLength(3);
    expect(config.blocks[2].title).toBe("Hotline");
    expect(config.blocks[2].id).not.toBe(added.id);

    await vivrService.updateBlock("org_vivr_test", vivr.id, added.id, {
      title: "Renamed",
      config: { url: "https://example.com/new" },
    });
    config = await currentConfig(vivr.id);
    expect(config.blocks.find((block) => block.id === added.id)?.config).toEqual({
      url: "https://example.com/new",
    });

    await vivrService.removeBlock("org_vivr_test", vivr.id, added.id);
    config = await currentConfig(vivr.id);
    expect(config.blocks).toHaveLength(2);
  });

  it("rejects unsupported block types and invalid block configs", async () => {
    const { vivr } = await vivrService.createVivr("org_vivr_test", {
      title: "Emergency",
      slug: "emergency",
    });

    await expect(
      vivrService.addBlock("org_vivr_test", vivr.id, { type: "weather", title: "Wx", config: {} }),
    ).rejects.toThrow(/not available/i);

    await expect(
      vivrService.addBlock("org_vivr_test", vivr.id, linkBlock({ config: { url: "nope" } })),
    ).rejects.toThrow(/url/i);
  });

  it("rebases the draft config when core properties change", async () => {
    const { vivr } = await vivrService.createVivr("org_vivr_test", {
      title: "Old Title",
      slug: "old-slug",
      brandColor: "#4154a3",
    });
    await vivrService.addBlock("org_vivr_test", vivr.id, linkBlock());

    await vivrService.updateCoreProperties("org_vivr_test", vivr.id, {
      title: "New Title",
      slug: "new-slug",
      themeMode: "dark",
      brandColor: "#000000",
    });

    const config = await currentConfig(vivr.id);
    expect(config.profile.name).toBe("New Title");
    expect(config.theme.primary).toBe("#000000");
    expect(config.theme.mode).toBe("dark");
    expect(config.blocks).toHaveLength(1);

    await expect(
      vivrService.updateCoreProperties("org_vivr_test", vivr.id, { slug: "old-slug" }),
    ).rejects.toThrow(/already taken/i);
  });

  it("publishes atomically: draft keeps editing, published version is immutable", async () => {
    const { vivr } = await vivrService.createVivr("org_vivr_test", {
      title: "Publishable",
      slug: "publishable",
    });

    // Cannot publish with zero blocks.
    await expect(vivrService.publish("org_vivr_test", vivr.id, actorId)).rejects.toThrow(
      /at least one block/i,
    );

    await vivrService.addBlock("org_vivr_test", vivr.id, linkBlock());
    const { version } = await vivrService.publish("org_vivr_test", vivr.id, actorId);
    expect(version.sequence).toBe(2);
    expect(version.publishedAt).not.toBeNull();
    expect(version.publishedById).toBe(actorId);

    const live = await vivrRepo.findByIdForOrganization(vivr.id, "org_vivr_test");
    const published = await vivrRepo.listForOrganization("org_vivr_test");
    expect(live?.status).toBe("published");
    expect(published[0].publishedSequence).toBe(2);

    // Editing the draft must not touch the published snapshot.
    await vivrService.addBlock("org_vivr_test", vivr.id, {
      ...linkBlock({ title: "Second" }),
      type: "website",
    });
    const versions = await vivrRepo.listForOrganization("org_vivr_test");
    expect(versions[0].draftSequence).toBe(1);
    expect(versions[0].publishedSequence).toBe(2);
  });

  it("rolls back the live pointer to a previous published version", async () => {
    const { vivr } = await vivrService.createVivr("org_vivr_test", {
      title: "Versioned",
      slug: "versioned",
    });
    await vivrService.addBlock("org_vivr_test", vivr.id, linkBlock({ title: "First" }));
    const firstPublish = await vivrService.publish("org_vivr_test", vivr.id, actorId);

    await vivrService.addBlock("org_vivr_test", vivr.id, linkBlock({ title: "Second Block" }));
    const secondPublish = await vivrService.publish("org_vivr_test", vivr.id, actorId);
    expect(secondPublish.version.id).not.toBe(firstPublish.version.id);

    await vivrService.rollback("org_vivr_test", vivr.id, firstPublish.version.id);

    const live = await vivrRepo.findByIdForOrganization(vivr.id, "org_vivr_test");
    expect(live?.currentPublishedVersionId).toBe(firstPublish.version.id);

    // The draft must still allow future edits after a rollback.
    await vivrService.addBlock("org_vivr_test", vivr.id, linkBlock({ title: "After Rollback" }));
  });

  it("scopes every operation to the organization", async () => {
    await createOrganizationRepository(testDb.db).upsert({
      id: "org_other",
      name: "Other Org",
      slug: "other-org",
    });
    const { vivr } = await vivrService.createVivr("org_vivr_test", {
      title: "Ours",
      slug: "ours",
    });

    await expect(
      vivrService.addBlock("org_other", vivr.id, linkBlock()),
    ).rejects.toThrow(/not found/i);

    await expect(
      vivrService.publish("org_other", vivr.id, actorId),
    ).rejects.toThrow();
  });
});

async function currentConfig(vivrId: string): Promise<VivrConfig> {
  const draft = await versionRepo.requireDraft(vivrId, ACTOR.organizationId);
  return parseVivrConfig(draft.configJson);
}