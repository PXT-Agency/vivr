"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Plus, Users } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Organization switcher + creation form (Better Auth organization client
 * plugin). Switching calls `organization.setActive`, which validates
 * membership server-side — a user can never select an organization they do
 * not belong to (the API rejects it with
 * USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION). The active organization is
 * persisted on the session server-side and revalidated by the server
 * helpers on every request.
 */
export function OrganizationSwitcher({
  redirectTo = "/dashboard",
}: {
  redirectTo?: string;
}) {
  const router = useRouter();
  const { data: organizations } = authClient.useListOrganizations();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function switchTo(organizationId: string) {
    setPending(true);
    setError(null);
    const { error: switchError } = await authClient.organization.setActive({
      organizationId,
    });
    setPending(false);

    if (switchError) {
      setError("Could not switch organization.");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  async function createOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();

    if (!name || !slug) {
      setPending(false);
      setError("Organization name and slug are required.");
      return;
    }

    const { error: createError } = await authClient.organization.create({
      name,
      slug,
      keepCurrentActiveOrganization: false,
    });
    setPending(false);

    if (createError) {
      const message = createError.message ?? "";
      setError(
        /slug/i.test(message)
          ? "That organization slug is already taken."
          : "Could not create the organization.",
      );
      return;
    }

    setCreating(false);
    router.push(redirectTo);
    router.refresh();
  }

  const orgList = organizations ?? [];

  if (organizations === undefined || organizations === null) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Building2 aria-hidden="true" className="size-4" />
        Loading organizations…
      </div>
    );
  }

  if (orgList.length === 0 && !creating) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">No organization</span>
        <Button type="button" size="sm" variant="outline" onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" className="size-4" />
          Create
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeOrganization ? (
        <span
          className="bg-muted text-foreground inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium"
          title={activeOrganization.slug}
        >
          <Building2 aria-hidden="true" className="size-4" />
          {activeOrganization.name}
        </span>
      ) : null}
      <div className="flex flex-wrap items-center gap-1">
        {orgList.map((organization) =>
          activeOrganization?.id === organization.id ? null : (
            <Button
              key={organization.id}
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => switchTo(organization.id)}
              title={`Switch to ${organization.name}`}
            >
              {organization.name}
            </Button>
          ),
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setCreating((current) => !current)}
        disabled={pending}
      >
        <Plus aria-hidden="true" className="size-4" />
        New
      </Button>
      {creating ? (
        <Card className="absolute right-6 top-16 z-20 w-80 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">Create organization</CardTitle>
            <CardDescription>
              You will be the organization admin (org:admin).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createOrganization} className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="org-name">Name</Label>
                <Input id="org-name" name="name" required disabled={pending} placeholder="Acme Ltd" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="org-slug">Slug</Label>
                <Input
                  id="org-slug"
                  name="slug"
                  required
                  disabled={pending}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  placeholder="acme-ltd"
                />
              </div>
              {error ? (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  <Users aria-hidden="true" className="size-4" />
                  Create
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
