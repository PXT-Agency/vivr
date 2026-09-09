import {
  ArrowRight,
  Bell,
  ClipboardList,
  ExternalLink,
  FileText,
  Globe,
  Link2,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Phone,
  TriangleAlert,
} from "lucide-react";

import type { VivrBlock, VivrConfig } from "@/types/vivr";
import { isVivrSocialPlatform } from "@/config/vivr";

/**
 * Shared server-side renderer for a one-page VIVR.
 *
 * This is the SAME component the builder uses as its preview rail and the
 * public runtime will use for `/v/[slug]` in Phase 7, so "preview equals
 * public rendering" (docs/04 Step 5) holds by construction.
 *
 * No client interactivity is needed for preview; interactive blocks (forms)
 * render their fields read-only. All user-authored strings are rendered by
 * React (auto-escaped); no raw HTML is ever emitted (docs/05 safety).
 */

export function VivrPublicPage({ config }: { config: VivrConfig }) {
  const { profile, theme } = config;
  const enabledBlocks = config.blocks.filter((block) => block.enabled);

  return (
    <div className="bg-background text-foreground flex w-full flex-col overflow-hidden">
      {theme.coverImageUrl ? (
        <div className="h-28 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={theme.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 px-4 pb-4 pt-5">
        {theme.logoImageUrl ? (
          <div className="size-14 overflow-hidden rounded-full border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={theme.logoImageUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}
        <h1 className="text-xl font-bold tracking-tight">{profile.name}</h1>
        {profile.description ? (
          <p className="text-muted-foreground text-sm">{profile.description}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2.5 px-4 pb-6">
        {enabledBlocks.length === 0 ? (
          <p className="text-muted-foreground text-sm">This page has no blocks yet.</p>
        ) : (
          enabledBlocks.map((block) => (
            <VivrPublicBlock key={block.id} block={block} primary={theme.primary} />
          ))
        )}
      </div>
    </div>
  );
}

export function VivrPublicBlock({
  block,
  primary,
}: {
  block: VivrBlock;
  primary: string;
}) {
  switch (block.type) {
    case "link":
      return <LinkBlock key="link" block={block} primary={primary} />;
    case "website":
      return <WebsiteBlock key="website" block={block} primary={primary} />;
    case "call":
      return <CallBlock key="call" block={block} primary={primary} />;
    case "whatsapp":
      return <WhatsAppBlock key="whatsapp" block={block} primary={primary} />;
    case "sms":
      return <SmsBlock key="sms" block={block} primary={primary} />;
    case "map":
      return <MapBlock key="map" block={block} primary={primary} />;
    case "file":
      return <FileBlock key="file" block={block} primary={primary} />;
    case "alert":
      return <AlertBlock key="alert" block={block} />;
    case "social":
      return <SocialBlock key="social" block={block} />;
    case "form":
      return <FormBlock key="form" block={block} primary={primary} />;
    default:
      return <DeferredBlock key={String(block.type)} block={block} />;
  }
}

interface BlockButtonProps {
  title: string;
  href: string;
  primary: string;
  icon: React.ReactNode;
  description?: string | null;
}

function BlockButton({ title, href, primary, icon, description }: BlockButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{ backgroundColor: primary }}
      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-white shadow-sm transition-opacity hover:opacity-90"
    >
      <span aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        {description ? (
          <span className="block truncate text-xs opacity-80">{description}</span>
        ) : null}
      </span>
      <ArrowRight aria-hidden="true" className="size-4 shrink-0 opacity-80" />
    </a>
  );
}

function LinkBlock({ block, primary }: { block: VivrBlock; primary: string }) {
  const url = configString(block, "url");
  if (!url) return null;
  return (
    <BlockButton
      title={block.title}
      description={url}
      href={url}
      primary={primary}
      icon={<Link2 aria-hidden="true" className="size-5" />}
    />
  );
}

function WebsiteBlock({ block, primary }: { block: VivrBlock; primary: string }) {
  const url = configString(block, "url");
  if (!url) return null;
  return (
    <BlockButton
      title={block.title}
      description={url}
      href={url}
      primary={primary}
      icon={<Globe aria-hidden="true" className="size-5" />}
    />
  );
}

function CallBlock({ block, primary }: { block: VivrBlock; primary: string }) {
  const phone = configString(block, "phone");
  if (!phone) return null;
  return (
    <BlockButton
      title={block.title}
      description={phone}
      href={`tel:${phone.replace(/[^+0-9]/g, "")}`}
      primary={primary}
      icon={<Phone aria-hidden="true" className="size-5" />}
    />
  );
}

function WhatsAppBlock({ block, primary }: { block: VivrBlock; primary: string }) {
  const phone = configString(block, "phone");
  if (!phone) return null;
  const message = configString(block, "message") ?? "";
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return (
    <BlockButton
      title={block.title}
      description={phone}
      href={`https://wa.me/${phone.replace(/\D/g, "")}${query}`}
      primary={primary}
      icon={<MessageCircle aria-hidden="true" className="size-5" />}
    />
  );
}

function SmsBlock({ block, primary }: { block: VivrBlock; primary: string }) {
  const phone = configString(block, "phone");
  if (!phone) return null;
  const message = configString(block, "message") ?? "";
  const query = message ? `?body=${encodeURIComponent(message)}` : "";
  return (
    <BlockButton
      title={block.title}
      description={phone}
      href={`sms:${phone.replace(/[^+0-9]/g, "")}${query}`}
      primary={primary}
      icon={<MessageSquareText aria-hidden="true" className="size-5" />}
    />
  );
}

function MapBlock({ block, primary }: { block: VivrBlock; primary: string }) {
  const latitude = configNumber(block, "latitude");
  const longitude = configNumber(block, "longitude");
  const query = configString(block, "query");
  if (latitude === null || longitude === null) return null;
  const destination = query?.trim() ?? `${latitude},${longitude}`;
  const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
  return (
    <BlockButton
      title={block.title}
      description={destination}
      href={href}
      primary={primary}
      icon={<MapPin aria-hidden="true" className="size-5" />}
    />
  );
}

function FileBlock({ block, primary }: { block: VivrBlock; primary: string }) {
  const url = configString(block, "url");
  if (!url) return null;
  const fileName = configString(block, "fileName");
  return (
    <BlockButton
      title={block.title}
      description={fileName ?? url}
      href={url}
      primary={primary}
      icon={<FileText aria-hidden="true" className="size-5" />}
    />
  );
}

function AlertBlock({ block }: { block: VivrBlock }) {
  const content = configString(block, "content");
  const severity = configString(block, "severity");
  if (!content) return null;
  const styles =
    severity === "danger"
      ? "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
      : severity === "warning"
        ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
        : "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100";
  const Icon =
    severity === "danger"
      ? TriangleAlert
      : severity === "warning"
        ? Bell
        : Bell;
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${styles}`}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span className="whitespace-pre-wrap">{content}</span>
    </div>
  );
}

function SocialBlock({ block }: { block: VivrBlock }) {
  const links = configArray(block, "links");
  if (links.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
        {block.title}
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {links.map((link, index) => {
          const url = readString(link, "url");
          const platform = readString(link, "platform");
          if (!url) return null;
          return (
            <a
              key={`${platform ?? "social"}-${index}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors"
            >
              <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{isVivrSocialPlatform(platform) ? platform : "link"}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function FormBlock({ block, primary }: { block: VivrBlock; primary: string }) {
  const fields = configArray(block, "fields");
  if (fields.length === 0) return null;
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <p className="text-sm font-semibold">{block.title}</p>
      <div className="flex flex-col gap-2.5">
        {fields.map((field, index) => {
          const id = readString(field, "id") ?? `field-${index}`;
          const label = readString(field, "label") ?? "Field";
          const type = readString(field, "type") ?? "text";
          const required = Boolean(field && typeof field === "object" && (field as Record<string, unknown>).required === true);
          return (
            <label key={id} className="flex flex-col gap-1 text-xs">
              <span className="text-foreground">
                {label}
                {required ? " *" : ""}
              </span>
              {type === "textarea" ? (
                <textarea disabled className="h-16 w-full rounded-md border bg-transparent px-3 py-2 text-sm" />
              ) : (
                <input
                  type={type === "tel" ? "tel" : "text"}
                  disabled
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                />
              )}
            </label>
          );
        })}
      </div>
      <button
        type="button"
        disabled
        style={{ backgroundColor: primary }}
        className="w-full rounded-md px-4 py-2 text-sm font-semibold text-white opacity-60"
      >
        Submit
      </button>
    </div>
  );
}

function DeferredBlock({ block }: { block: VivrBlock }) {
  return (
    <div className="border-dashed text-muted-foreground flex items-center gap-2 rounded-xl border px-4 py-3 text-sm">
      <ClipboardList aria-hidden="true" className="size-4 shrink-0" />
      <span>
        “{block.title}” ({String(block.type)}) isn&apos;t available yet.
      </span>
    </div>
  );
}

function configObject(block: VivrBlock): Record<string, unknown> {
  return block.config && typeof block.config === "object" && !Array.isArray(block.config)
    ? (block.config as Record<string, unknown>)
    : {};
}

function configString(block: VivrBlock, key: string): string | null {
  const value = configObject(block)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function configNumber(block: VivrBlock, key: string): number | null {
  const value = configObject(block)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function configArray(block: VivrBlock, key: string): Array<Record<string, unknown>> {
  const value = configObject(block)[key];
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      )
    : [];
}

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}