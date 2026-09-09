"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createVivr } from "@/server/actions/vivr";
import { VIVR_DEFAULT_BRAND_COLOR, VIVR_THEME_MODES } from "@/config/vivr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ColorField,
  Field,
  FormError,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/vivr/form-controls";
import { VIVR_TEMPLATE_KEYS, vivrTemplates } from "@/server/services/vivr/templates";

const templateOptions = [
  { value: "", label: "Start from scratch" },
  ...VIVR_TEMPLATE_KEYS.map((key) => ({
    value: key,
    label: vivrTemplates[key].label,
  })),
];

export function NewVivrForm({ orgName }: { orgName?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await createVivr(new FormData(event.currentTarget));
    if (result.ok && result.vivrId) {
      router.push(`/dashboard/vivr/${result.vivrId}`);
      router.refresh();
      return;
    }
    setError(result.error ?? "Something went wrong.");
    setPending(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/dashboard/vivr">&larr; Back to VIVRs</Link>
      </Button>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">New VIVR</h1>
        <p className="text-muted-foreground text-sm">
          Set up your one-page VIVR, then add blocks in the builder.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Setup</CardTitle>
          <CardDescription>
            Step 1 of the builder: identity and branding{orgName ? ` for ${orgName}` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Field label="Template" hint="Pre-fills blocks you can edit or remove.">
              <SelectField name="template" defaultValue="" options={templateOptions} />
            </Field>
            <Field label="Name" hint="Shown as the page title to callers.">
              <TextField name="title" placeholder="Nakuru County Emergency Response" required />
            </Field>
            <Field label="Public slug" hint="This becomes the public URL: /v/your-slug">
              <TextField name="slug" placeholder="nakuru-emergency" required />
            </Field>
            <Field label="Description">
              <TextAreaField
                name="description"
                placeholder="Official public emergency information"
                maxLength={500}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Brand color">
                <ColorField name="brandColor" defaultValue={VIVR_DEFAULT_BRAND_COLOR} />
              </Field>
              <Field label="Theme mode">
                <SelectField
                  name="themeMode"
                  defaultValue="light"
                  options={VIVR_THEME_MODES.map((mode) => ({ value: mode, label: mode }))}
                />
              </Field>
            </div>
            <Field label="Logo image URL" hint="Optional. Paste a hosted image URL.">
              <TextField name="logoImageUrl" placeholder="https://example.com/logo.png" />
            </Field>
            <Field label="Cover / hero image URL" hint="Optional. Paste a hosted image URL.">
              <TextField name="coverImageUrl" placeholder="https://example.com/cover.png" />
            </Field>
            <FormError message={error} />
            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create VIVR"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
