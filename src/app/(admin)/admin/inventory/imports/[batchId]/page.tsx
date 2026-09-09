import type { Metadata } from "next";

import { getImportBatch } from "@/server/dashboard/admin";
import { ImportBatchDetail } from "@/components/dashboard/batch-detail";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Import batch",
};

export default async function ImportBatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const detail = await getImportBatch(batchId);
  return <ImportBatchDetail detail={detail} />;
}