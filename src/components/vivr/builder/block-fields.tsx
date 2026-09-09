"use client";

import { Plus, Trash2 } from "lucide-react";

import type { VivrBlockType } from "@/config/vivr";
import { VIVR_SOCIAL_PLATFORMS } from "@/config/vivr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Controlled per-type block config editor. The builder keeps the values in
 * local state and passes the assembled `config` object to the server action on
 * save; validation happens server-side with Zod (docs/04 Step 6).
 */

export type BlockConfigValue = Record<string, unknown>;

export function defaultConfigFor(type: VivrBlockType): BlockConfigValue {
  switch (type) {
    case "link":
    case "website":
      return { url: "" };
    case "call":
      return { phone: "" };
    case "whatsapp":
      return { phone: "", message: "" };
    case "sms":
      return { phone: "", message: "" };
    case "map":
      return { latitude: "", longitude: "", query: "" };
    case "file":
      return { url: "", fileName: "" };
    case "alert":
      return { content: "", severity: "info" };
    case "social":
      return { links: [{ platform: "facebook", url: "" }] };
    case "form":
      return {
        fields: [{ id: createClientId(), label: "", type: "text", required: false }],
        submitAction: { kind: "mailto", email: "" },
      };
    default:
      return {};
  }
}

export function BlockConfigEditor({
  type,
  config,
  onChange,
}: {
  type: VivrBlockType;
  config: BlockConfigValue;
  onChange: (config: BlockConfigValue) => void;
}) {
  const setString = (key: string) => (value: string) => onChange({ ...config, [key]: value });
  const setNumber = (key: string) => (value: string) => {
    const parsed = Number(value);
    onChange({ ...config, [key]: value === "" ? "" : Number.isFinite(parsed) ? parsed : value });
  };

  switch (type) {
    case "link":
    case "website":
      return (
        <Field label="URL">
          <ControlledText
            value={stringOf(config.url)}
            onChange={setString("url")}
            placeholder="https://example.com"
            inputMode="url"
          />
        </Field>
      );

    case "call":
      return (
        <Field label="Phone number">
          <ControlledText
            value={stringOf(config.phone)}
            onChange={setString("phone")}
            placeholder="+254 700 000 000"
            inputMode="tel"
          />
        </Field>
      );

    case "whatsapp":
      return (
        <>
          <Field label="WhatsApp number">
            <ControlledText
              value={stringOf(config.phone)}
              onChange={setString("phone")}
              placeholder="+254 700 000 000"
              inputMode="tel"
            />
          </Field>
          <Field label="Pre-filled message (optional)">
            <ControlledTextarea
              value={stringOf(config.message)}
              onChange={setString("message")}
              placeholder="Hello, I need help…"
              maxLength={200}
            />
          </Field>
        </>
      );

    case "sms":
      return (
        <>
          <Field label="SMS number">
            <ControlledText
              value={stringOf(config.phone)}
              onChange={setString("phone")}
              placeholder="+254 700 000 000"
              inputMode="tel"
            />
          </Field>
          <Field label="Pre-filled message (optional)">
            <ControlledTextarea
              value={stringOf(config.message)}
              onChange={setString("message")}
              placeholder="Hello…"
              maxLength={160}
            />
          </Field>
        </>
      );

    case "map":
      return (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <ControlledText
                value={stringOf(config.latitude)}
                onChange={setNumber("latitude")}
                placeholder="-1.2833"
                inputMode="decimal"
              />
            </Field>
            <Field label="Longitude">
              <ControlledText
                value={stringOf(config.longitude)}
                onChange={setNumber("longitude")}
                placeholder="36.8167"
                inputMode="decimal"
              />
            </Field>
          </div>
          <Field label="Place name (optional)" hint="Shown as the button subtitle.">
            <ControlledText
              value={stringOf(config.query)}
              onChange={setString("query")}
              placeholder="Nakuru County, Kenya"
            />
          </Field>
        </>
      );

    case "file":
      return (
        <>
          <Field label="File URL">
            <ControlledText
              value={stringOf(config.url)}
              onChange={setString("url")}
              placeholder="https://example.com/notice.pdf"
              inputMode="url"
            />
          </Field>
          <Field label="File name (optional)">
            <ControlledText
              value={stringOf(config.fileName)}
              onChange={setString("fileName")}
              placeholder="Safety notice.pdf"
            />
          </Field>
        </>
      );

    case "alert":
      return (
        <>
          <Field label="Notice text">
            <ControlledTextarea
              value={stringOf(config.content)}
              onChange={setString("content")}
              placeholder="Heavy rains expected tonight…"
              maxLength={500}
            />
          </Field>
          <Field label="Severity">
            <ControlledSelect
              value={stringOf(config.severity)}
              onChange={setString("severity")}
              options={[
                { value: "info", label: "Info" },
                { value: "warning", label: "Warning" },
                { value: "danger", label: "Danger" },
              ]}
            />
          </Field>
        </>
      );

    case "social":
      return <SocialLinksEditor config={config} onChange={onChange} />;

    case "form":
      return <FormEditor config={config} onChange={onChange} />;

    default:
      return (
        <p className="text-muted-foreground text-sm">This block type isn’t configurable yet.</p>
      );
  }
}

function SocialLinksEditor({
  config,
  onChange,
}: {
  config: BlockConfigValue;
  onChange: (config: BlockConfigValue) => void;
}) {
  const links = Array.isArray(config.links)
    ? (config.links as Record<string, unknown>[]).map((item) => item ?? {})
    : [];

  function setLink(index: number, key: string, value: string) {
    const next = links.map((item, i) => (i === index ? { ...item, [key]: value } : item));
    onChange({ ...config, links: next });
  }

  function addLink() {
    onChange({ ...config, links: [...links, { platform: "other", url: "" }] });
  }

  function removeLink(index: number) {
    onChange({ ...config, links: links.filter((_, i) => i !== index) });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-foreground text-xs font-medium">Links</p>
      {links.map((link, index) => (
        <div key={index} className="flex items-start gap-2">
          <ControlledSelect
            value={stringOf(link.platform)}
            onChange={(value) => setLink(index, "platform", value)}
            options={VIVR_SOCIAL_PLATFORMS.map((platform) => ({
              value: platform,
              label: platform,
            }))}
            className="w-32"
          />
          <ControlledText
            value={stringOf(link.url)}
            onChange={(value) => setLink(index, "url", value)}
            placeholder="https://facebook.com/you"
            inputMode="url"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove link"
            onClick={() => removeLink(index)}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={addLink}>
          <Plus aria-hidden="true" className="size-4" /> Add link
        </Button>
      </div>
    </div>
  );
}

function FormEditor({
  config,
  onChange,
}: {
  config: BlockConfigValue;
  onChange: (config: BlockConfigValue) => void;
}) {
  const fields = Array.isArray(config.fields)
    ? (config.fields as Record<string, unknown>[]).map((item) => item ?? {})
    : [];
  const submitAction =
    config.submitAction && typeof config.submitAction === "object"
      ? (config.submitAction as Record<string, unknown>)
      : { kind: "mailto", email: "" };

  function setField(index: number, key: string, value: unknown) {
    const next = fields.map((item, i) => (i === index ? { ...item, [key]: value } : item));
    onChange({ ...config, fields: next });
  }

  function addField() {
    onChange({
      ...config,
      fields: [...fields, { id: createClientId(), label: "", type: "text", required: false }],
    });
  }

  function removeField(index: number) {
    onChange({ ...config, fields: fields.filter((_, i) => i !== index) });
  }

  const kind = stringOf(submitAction.kind) === "external" ? "external" : "mailto";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <p className="text-foreground text-xs font-medium">Fields</p>
        {fields.map((field, index) => (
          <div key={stringOf(field.id)} className="flex flex-col gap-2 rounded-md border p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <ControlledText
                  value={stringOf(field.label)}
                  onChange={(value) => setField(index, "label", value)}
                  placeholder="Field label"
                />
              </div>
              <ControlledSelect
                value={stringOf(field.type)}
                onChange={(value) => setField(index, "type", value)}
                options={[
                  { value: "text", label: "Text" },
                  { value: "textarea", label: "Paragraph" },
                  { value: "email", label: "Email" },
                  { value: "tel", label: "Phone" },
                ]}
                className="w-32"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove field"
                onClick={() => removeField(index)}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </div>
            <label className="text-muted-foreground flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={field.required === true}
                onChange={(event) => setField(index, "required", event.target.checked)}
              />
              Required
            </label>
          </div>
        ))}
        <div>
          <Button type="button" variant="outline" size="sm" onClick={addField}>
            <Plus aria-hidden="true" className="size-4" /> Add field
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-foreground text-xs font-medium">After submit</p>
        <ControlledSelect
          value={kind}
          onChange={(value) =>
            onChange({
              ...config,
              submitAction:
                value === "external"
                  ? { kind: "external", url: "" }
                  : { kind: "mailto", email: "" },
            })
          }
          options={[
            { value: "mailto", label: "Email to an address" },
            { value: "external", label: "Send to a URL" },
          ]}
        />
        {kind === "mailto" ? (
          <Field label="Email address">
            <ControlledText
              value={stringOf(submitAction.email)}
              onChange={(value) =>
                onChange({ ...config, submitAction: { kind: "mailto", email: value } })
              }
              placeholder="response@example.com"
              inputMode="email"
            />
          </Field>
        ) : (
          <Field label="Submit URL">
            <ControlledText
              value={stringOf(submitAction.url)}
              onChange={(value) =>
                onChange({ ...config, submitAction: { kind: "external", url: value } })
              }
              placeholder="https://example.com/forms/report"
              inputMode="url"
            />
          </Field>
        )}
        <p className="text-muted-foreground text-xs">
          Submissions are configured now; storage arrives with a later phase.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-foreground text-xs font-medium">{label}</span>
      {children}
      {hint ? <span className="text-muted-foreground text-xs">{hint}</span> : null}
    </label>
  );
}

function ControlledText({
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "url" | "tel" | "email" | "decimal";
}) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className="w-full"
    />
  );
}

function ControlledTextarea({
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <Textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
    />
  );
}

function ControlledSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-9 rounded-md border bg-transparent px-3 text-sm transition-colors ${className ?? ""}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function stringOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function createClientId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `field-${Date.now()}`;
}
