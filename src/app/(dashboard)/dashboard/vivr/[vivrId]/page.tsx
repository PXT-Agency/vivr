import type { Metadata } from "next";

import { getVivrBuilder } from "@/server/dashboard/vivr";
import { VivrBuilderClient } from "@/components/vivr/builder/builder-client";
import { OrganizationEmptyState } from "@/components/dashboard/organization-empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VIVR Builder",
};

export default async function VivrBuilderPage({
  params,
}: {
  params: Promise<{ vivrId: string }>;
}) {
  const { vivrId } = await params;
  const builder = await getVivrBuilder(vivrId);
  if (builder === null) {
    return <OrganizationEmptyState />;
  }
  return <VivrBuilderClient builder={builder} />;
}