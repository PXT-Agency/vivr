import type { VivrBlock } from "@/types/vivr";
import { VIVR_BLOCKS_MAX } from "@/config/vivr";

/**
 * Pure, immutable helpers over the ordered block list of a draft snapshot.
 * Each returns a new array; none mutates the input. Added so the builder
 * services are trivially unit-testable without a database.
 */

export function withBlockAppended(blocks: VivrBlock[], block: VivrBlock): VivrBlock[] {
  if (blocks.length >= VIVR_BLOCKS_MAX) {
    throw new Error(`A VIVR can contain at most ${VIVR_BLOCKS_MAX} blocks.`);
  }
  return [...blocks, { ...block }];
}

export function withBlockReplaced(
  blocks: VivrBlock[],
  blockId: string,
  block: VivrBlock,
): VivrBlock[] {
  const index = blocks.findIndex((candidate) => candidate.id === blockId);
  if (index === -1) {
    throw new Error(`Block ${blockId} not found.`);
  }
  return blocks.map((candidate, i) => (i === index ? { ...block, id: blockId } : candidate));
}

export function withoutBlock(blocks: VivrBlock[], blockId: string): VivrBlock[] {
  if (!blocks.some((candidate) => candidate.id === blockId)) {
    throw new Error(`Block ${blockId} not found.`);
  }
  return blocks.filter((candidate) => candidate.id !== blockId);
}

export function withBlockMoved(
  blocks: VivrBlock[],
  blockId: string,
  direction: "up" | "down",
): VivrBlock[] {
  const index = blocks.findIndex((candidate) => candidate.id === blockId);
  if (index === -1) {
    throw new Error(`Block ${blockId} not found.`);
  }
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= blocks.length) {
    return blocks;
  }
  const next = [...blocks];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function withBlockDuplicated(blocks: VivrBlock[], blockId: string): VivrBlock[] {
  const index = blocks.findIndex((candidate) => candidate.id === blockId);
  if (index === -1) {
    throw new Error(`Block ${blockId} not found.`);
  }
  if (blocks.length >= VIVR_BLOCKS_MAX) {
    throw new Error(`A VIVR can contain at most ${VIVR_BLOCKS_MAX} blocks.`);
  }
  const source = blocks[index];
  const clone: VivrBlock = {
    id: createBlockId(),
    type: source.type,
    enabled: source.enabled,
    title: source.title,
    config: source.config === undefined ? undefined : structuredClone(source.config),
  };
  return [...blocks.slice(0, index + 1), clone, ...blocks.slice(index + 1)];
}

export function withBlockEnabled(
  blocks: VivrBlock[],
  blockId: string,
  enabled: boolean,
): VivrBlock[] {
  const index = blocks.findIndex((candidate) => candidate.id === blockId);
  if (index === -1) {
    throw new Error(`Block ${blockId} not found.`);
  }
  return blocks.map((candidate, i) => (i === index ? { ...candidate, enabled } : candidate));
}

export function createBlockId(): string {
  return globalThis.crypto.randomUUID();
}
