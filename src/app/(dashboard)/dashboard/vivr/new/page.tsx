import type { Metadata } from "next";

import { AuthContextError, requireOrganization } from "@/server/auth";
import { NewVivrForm } from "@/components/vivr/new-vivr-form";
import { OrganizationEmptyState } from "@/components/dashboard/organization-empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New VIVR",
};

export default async function NewVivrPage() {
  const hasOrganization = await hasActiveOrganization();
  if (!hasOrganization) {
    return <OrganizationEmptyState />;
  }
  return <NewVivrForm />;
}

async function hasActiveOrganization(): Promise<boolean> {
  try {
    await requireOrganization();
    return true;
  } catch (error) {
    if (error instanceof AuthContextError && error.code === "missing_organization") {
      return false;
    }
    throw error;
  }
}
