import type { Metadata } from "next";

import { getVivrList } from "@/server/dashboard/vivr";
import { VivrList } from "@/components/vivr/vivr-list";
import { OrganizationEmptyState } from "@/components/dashboard/organization-empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VIVRs",
};

export default async function VivrListPage() {
  const listing = await getVivrList();
  if (!listing) {
    return <OrganizationEmptyState />;
  }
  return <VivrList listing={listing} />;
}