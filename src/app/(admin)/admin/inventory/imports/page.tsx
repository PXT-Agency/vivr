import type { Metadata } from "next";

import { getImportBatches } from "@/server/dashboard/admin";
import { ImportBatchesTable } from "@/components/dashboard/batch-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Import batches",
};

export default async function ImportBatchesPage() {
  const batches = await getImportBatches();
  return <ImportBatchesTable batches={batches} />;
}