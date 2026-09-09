"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  EyeOff,
  Eye,
  Pencil,
  Plus,
  Save,
  X,
  Trash2,
  Upload,
} from "lucide-react";

import type { VivrBlockType } from "@/config/vivr";
import { VIVR_BLOCK_TYPES, VIVR_BLOCK_TYPE_META } from "@/config/vivr";
import type { VivrBuilderView } from "@/server/dashboard/vivr";
import type { ActionResult } from "@/server/actions/vivr";
import {
  addBlock,
  duplicateBlock,
  moveBlock,
  publishVivr,
  removeBlock,
  rollbackVivr,
  toggleBlock,
  updateBlock,
  updateVivrProperties,
} from "@/server/actions/vivr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/components/dashboard/format";
import { VivrPreview } from "@/components/vivr/vivr-preview";
import {
  ColorField,
  Field,
  FormError,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/vivr/form-controls";
import {
  BlockConfigEditor,
  defaultConfigFor,
  type BlockConfigValue,
} from "@/components/vivr/builder/block-fields";
import { VersionHistory } from "@/components/vivr/builder/version-history";

const blockTypeOptions = VIVR_BLOCK_TYPES.filter(
  (type) => VIVR_BLOCK_TYPE_META[type].supported,
).map((type) => ({ value: type, label: VIVR_BLOCK_TYPE_META[type].label }));

export function VivrBuilderClient({ builder }: { builder: VivrBuilderView }) {
  const router = useRouter();
  const { vivr, draft, canEdit } = builder;

  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{
    mode: "add" | "edit";
    type: VivrBlockType;
    blockId?: string;
  } | null>(null);
  const [blockTitle, setBlockTitle] = useState("");
  const [blockConfig, setBlockConfig] = useState<BlockConfigValue>({});

  async function run(action: () => Promise<ActionResult>) {
    setActionError(null);
    const result = await action();
    if (!result.ok) {
      setActionError(result.error ?? "Something went wrong.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function onSaveProperties(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);
    const result = await updateVivrProperties(vivr.id, new FormData(event.currentTarget));
    setSaving(false);
    if (!result.ok) {
      setActionError(result.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  function startAddBlock(type: VivrBlockType) {
    setEditing({ mode: "add", type });
    setBlockTitle(VIVR_BLOCK_TYPE_META[type].label);
    setBlockConfig(defaultConfigFor(type));
    setActionError(null);
  }

  function startEditBlock(blockId: string, type: VivrBlockType) {
    const block = draft.config.blocks.find((candidate) => candidate.id === blockId);
    if (!block) return;
    setEditing({ mode: "edit", type, blockId });
    setBlockTitle(block.title);
    setBlockConfig(
      block.config && typeof block.config === "object" && !Array.isArray(block.config)
        ? (block.config as BlockConfigValue)
        : defaultConfigFor(type),
    );
    setActionError(null);
  }

  function cancelEditing() {
    setEditing(null);
    setActionError(null);
  }

  async function onSaveBlock() {
    if (!editing) return;
    if (editing.mode === "add") {
      await run(() => addBlock(vivr.id, { type: editing.type, title: blockTitle, config: blockConfig }));
    } else if (editing.blockId) {
      await run(() =>
        updateBlock(vivr.id, editing.blockId!, { title: blockTitle, config: blockConfig }),
      );
    }
    setEditing(null);
  }

  async function onPublish() {
    if (!(await run(() => publishVivr(vivr.id)))) return;
    setEditing(null);
  }

  async function onRollback(versionId: string) {
    if (!window.confirm("Make this version the live published VIVR? The build draft is unchanged.")) {
      return;
    }
    await run(() => rollbackVivr(vivr.id, versionId));
  }

  async function onDeleteBlock(blockId: string) {
    if (!window.confirm("Delete this block from the draft? This can be published over later.")) {
      return;
    }
    await run(() => removeBlock(vivr.id, blockId));
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/dashboard/vivr">&larr; VIVRs</Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{vivr.title}</h1>
              <Badge variant={statusVariant(vivr.status)}>{vivr.status}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Public URL: /v/{vivr.slug}
              {builder.lastPublishedAt
                ? ` · last published ${formatDate(builder.lastPublishedAt)}`
                : " · not published yet"}
            </p>
          </div>
        </div>
      </div>

      {!canEdit ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground text-sm">
              Your role ({builder.context.organizationRole}) has read-only access. Editors and
              admins can edit and publish this VIVR.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <FormError message={actionError} />

          <Card>
            <CardHeader>
              <CardTitle>Core properties</CardTitle>
              <CardDescription>
                Name, public URL and branding for the one-page VIVR.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canEdit ? (
                <form onSubmit={onSaveProperties} className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Name">
                      <TextField name="title" defaultValue={vivr.title} required />
                    </Field>
                    <Field label="Public slug" hint="/v/{slug}">
                      <TextField name="slug" defaultValue={vivr.slug} required />
                    </Field>
                  </div>
                  <Field label="Description">
                    <TextAreaField
                      name="description"
                      defaultValue={vivr.description}
                      maxLength={500}
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Brand color">
                      <ColorField name="brandColor" defaultValue={vivr.brandColor} />
                    </Field>
                    <Field label="Theme mode">
                      <SelectField
                        name="themeMode"
                        defaultValue={vivr.themeMode}
                        options={["light", "dark"].map((mode) => ({ value: mode, label: mode }))}
                      />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Logo image URL" hint="Optional.">
                      <TextField
                        name="logoImageUrl"
                        defaultValue={vivr.logoImageUrl ?? ""}
                        placeholder="https://example.com/logo.png"
                      />
                    </Field>
                    <Field label="Cover / hero image URL" hint="Optional.">
                      <TextField
                        name="coverImageUrl"
                        defaultValue={vivr.coverImageUrl ?? ""}
                        placeholder="https://example.com/cover.png"
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving}>
                      <Save aria-hidden="true" className="size-4" />
                      {saving ? "Saving…" : "Save properties"}
                    </Button>
                  </div>
                </form>
              ) : (
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground text-xs font-medium">Public slug</dt>
                    <dd>/v/{vivr.slug}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-medium">Description</dt>
                    <dd className="whitespace-pre-wrap">{vivr.description || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-medium">Brand color</dt>
                    <dd className="flex items-center gap-2">
                      <span
                        className="inline-block size-4 rounded-full border"
                        style={{ backgroundColor: vivr.brandColor }}
                      />
                      {vivr.brandColor}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-medium">Theme</dt>
                    <dd>{vivr.themeMode}</dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Blocks</CardTitle>
              <CardDescription>
                Ordered action blocks on the single page. Use the arrows to reorder.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {draft.config.blocks.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No blocks yet. Add your first block below.
                </p>
              ) : null}

              <ul className="flex flex-col gap-2">
                {draft.config.blocks.map((block, index) => {
                  const meta = VIVR_BLOCK_TYPE_META[block.type];
                  const first = index === 0;
                  const last = index === draft.config.blocks.length - 1;
                  return (
                    <li
                      key={block.id}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 ${
                        block.enabled ? "" : "opacity-60"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{block.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {meta?.label ?? block.type}
                          {block.enabled ? "" : " · hidden"}
                        </p>
                      </div>
                      {canEdit ? (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Move up"
                            disabled={first}
                            onClick={() => run(() => moveBlock(vivr.id, block.id, "up"))}
                          >
                            <ArrowUp aria-hidden="true" className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Move down"
                            disabled={last}
                            onClick={() => run(() => moveBlock(vivr.id, block.id, "down"))}
                          >
                            <ArrowDown aria-hidden="true" className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={
                              block.enabled ? "Hide from published page" : "Show on published page"
                            }
                            onClick={() =>
                              run(() => toggleBlock(vivr.id, block.id, !block.enabled))
                            }
                          >
                            {block.enabled ? (
                              <EyeOff aria-hidden="true" className="size-4" />
                            ) : (
                              <Eye aria-hidden="true" className="size-4" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Duplicate block"
                            onClick={() => run(() => duplicateBlock(vivr.id, block.id))}
                          >
                            <Copy aria-hidden="true" className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Delete block"
                            className="hover:text-destructive"
                            onClick={() => onDeleteBlock(block.id)}
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Edit block"
                            onClick={() => startEditBlock(block.id, block.type)}
                          >
                            <Pencil aria-hidden="true" className="size-4" />
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {canEdit ? (
                <div className="flex flex-col gap-3">
                  {editing && editing.mode === "add" && (
                    <div className="rounded-lg border p-4">
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                        Add block · {VIVR_BLOCK_TYPE_META[editing.type]?.label}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {blockTypeOptions.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={editing?.mode === "add" && editing.type === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => startAddBlock(option.value)}
                      >
                        <Plus aria-hidden="true" className="size-4" />
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {canEdit && editing ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>
                    {editing.mode === "add"
                      ? `Add ${VIVR_BLOCK_TYPE_META[editing.type]?.label}`
                      : "Edit block"}
                  </CardTitle>
                  <CardDescription>
                    Configure the block, then save. Validation happens server-side.
                  </CardDescription>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Cancel" onClick={cancelEditing}>
                  <X aria-hidden="true" className="size-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Field label="Label">
                  <div className="flex-1">
                    <input
                      className="h-9 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
                      value={blockTitle}
                      onChange={(event) => setBlockTitle(event.target.value)}
                      maxLength={80}
                      placeholder="Block label"
                    />
                  </div>
                </Field>
                <BlockConfigEditor
                  type={editing.type}
                  config={blockConfig}
                  onChange={setBlockConfig}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={cancelEditing}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={onSaveBlock}>
                    <Save aria-hidden="true" className="size-4" />
                    Save block
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {canEdit ? (
            <Card>
              <CardHeader>
                <CardTitle>Publish</CardTitle>
                <CardDescription>
                  Publishing snapshots the current draft into an immutable version and makes it
                  live — atomically.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <Badge variant={vivr.status === "draft" ? "secondary" : "default"}>
                  {vivr.status === "draft" ? "Draft — not published" : "Published"}
                </Badge>
                <Button onClick={onPublish}>
                  <Upload aria-hidden="true" className="size-4" />
                  Publish version
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="py-6">
              <VersionHistory
                versions={builder.versions}
                canRollback={Boolean(canEdit)}
                onRollback={canEdit ? onRollback : undefined}
              />
            </CardContent>
          </Card>
        </div>

        <div className="w-full lg:w-96 lg:shrink-0">
          <VivrPreview config={draft.config} />
        </div>
      </div>
    </div>
  );
}

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "published") return "default";
  if (status === "archived") return "outline";
  return "secondary";
}