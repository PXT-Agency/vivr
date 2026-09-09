import Link from "next/link";

import type { AdminImportBatchView } from "@/server/dashboard/admin";
import type { ImportBatchMode, ImportBatchStatus } from "@/config/starNumbers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, humanizeLabel } from "@/components/dashboard/format";

const modeVariants: Record<ImportBatchMode, "default" | "secondary"> = {
  dry_run: "secondary",
  commit: "default",
};

const statusVariants: Record<
  ImportBatchStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  started: "secondary",
  completed: "outline",
  failed: "destructive",
};

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value.toLocaleString()}</span>
    </span>
  );
}

export function ImportBatchesTable({ batches }: { batches: AdminImportBatchView[] }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Import batches</h1>
        <p className="text-muted-foreground text-sm">
          Star-number inventory imports run by platform administrators. Batch rows are read-only
          after the import finishes.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-col gap-2">
          <CardTitle>Recent imports</CardTitle>
          <CardDescription>The most recent {batches.length} batches.</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Accepted</TableHead>
              <TableHead className="text-right">Rejected</TableHead>
              <TableHead className="text-right">Conflicts</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((batch) => (
              <TableRow key={batch.id}>
                <TableCell>
                  <Button asChild variant="link" size="sm" className="h-auto px-0">
                    <Link href={`/admin/inventory/imports/${batch.id}`}>{batch.sourceName}</Link>
                  </Button>
                </TableCell>
                <TableCell>
                  <Badge variant={modeVariants[batch.mode]}>{humanizeLabel(batch.mode)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariants[batch.status]}>{humanizeLabel(batch.status)}</Badge>
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {batch.summary.accepted.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {batch.summary.rejected.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {batch.summary.conflict.toLocaleString()}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                  {formatDate(batch.startedAt)}
                </TableCell>
              </TableRow>
            ))}
            {batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                  No import batches recorded yet. Run the inventory import CLI to create one.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <SummaryChip label="Total rows" value={batches.reduce((sum, b) => sum + b.summary.total, 0)} />
        <SummaryChip
          label="Created"
          value={batches.reduce((sum, b) => sum + b.summary.created, 0)}
        />
        <SummaryChip
          label="Updated"
          value={batches.reduce((sum, b) => sum + b.summary.updated, 0)}
        />
        <SummaryChip
          label="Duplicates"
          value={batches.reduce((sum, b) => sum + b.summary.duplicate, 0)}
        />
        <SummaryChip
          label="Missing"
          value={batches.reduce((sum, b) => sum + b.summary.missing, 0)}
        />
      </div>
    </div>
  );
}