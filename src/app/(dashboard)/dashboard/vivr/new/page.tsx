import type { Metadata } from "next";

import { getVivrList } from "@/server/dashboard/vivr";
import { requireOrganization } from "@/server/dashboard/auth";
import { NewVivrForm } from "@/components/vivr/new-vivr-form";
import { OrganizationEmptyState } from "@/components/dashboard/organization-empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New VIVR",
};

export default async function NewVivrPage() {
  const org = await requireOrganization();
  const listing = await getVivrList();
  if (!listing) {
    return <OrganizationEmptyState />;
  }
  return <NewVivrForm orgName={org.name} />;
}