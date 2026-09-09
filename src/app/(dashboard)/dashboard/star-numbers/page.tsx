import type { Metadata } from "next";

import { getStarNumberListing } from "@/server/dashboard/tenant";
import { StarNumbersTable } from "@/components/dashboard/star-numbers-table";
import { OrganizationEmptyState } from "@/components/dashboard/organization-empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Platform inventory",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toPositiveInt(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (raw === undefined || raw === "") return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default async function StarNumbersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const listing = await getStarNumberListing({
    search: first(params.q),
    category: first(params.category),
    status: first(params.status),
    page: toPositiveInt(params.page),
  });

  if (!listing) {
    return <OrganizationEmptyState />;
  }

  return <StarNumbersTable listing={listing} />;
}