import type { Metadata } from "next";

import { getDashboardOverview } from "@/server/dashboard/tenant";
import { DashboardOverview } from "@/components/dashboard/overview";
import { OrganizationEmptyState } from "@/components/dashboard/organization-empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardHomePage() {
  const overview = await getDashboardOverview();

  if (!overview) {
    return <OrganizationEmptyState />;
  }

  return <DashboardOverview overview={overview} />;
}