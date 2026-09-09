import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { AdminImportBatchDetail } from "@/server/dashboard/admin";
import type { ImportBatchMode, ImportBatchStatus, ImportRowResult } from "@/config/starNumbers";
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
import { formatDate, humanizeLabel, titleCase } from "@/components/dashboard/format";

const modeVariants: Record<ImportBatchMode, "default" | "secondary"> = {
  dry_run: "secondary",
  commit: "default",
};

const statusVariants: Record<ImportBatchStatus, "default" | "secondary" | "outline" | "destructive"> =
  {
    started: "secondary",
    completed: "outline",
    failed: "destructive",
  };

const resultVariants: Record<ImportRowResult, "default" | "secondary" | "outline" | "destructive"> =
  {
    accepted: "secondary",
    duplicate: "outline",
    conflict: "outline",
    missing: "outline",
    rejected: "destructive",
  };

const MAX_ERROR_LENGTH = 120;

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <span className="text-xl font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function ImportBatchDetail({ detail }: { detail: AdminImportBatchDetail }) {
  const { batch, rows } = detail;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/inventory/imports">
            <ArrowLeft aria-hidden="true" />
            Back to import batches
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{batch.sourceName}</h1>
          <Badge variant={modeVariants[batch.mode]}>{humanizeLabel(batch.mode)}</Badge>
          <Badge variant={statusVariants[batch.status]}>{humanizeLabel(batch.status)}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Started {formatDate(batch.startedAt)}
          {batch.completedAt ? ` · Completed ${formatDate(batch.completedAt)}` : ""}
        </p>
      </div>

      <Card>
        <CardHeader className="flex-col gap-2">
          <CardTitle>Summary</CardTitle>
          <CardDescription>
            {batch.summary.alreadyProcessed
              ? "This source was previously committed; the batch was recorded as already processed."
              : "Row-level outcome counts for this batch."}
          </CardDescription>
        </CardHeader>
        <div className="grid grid-cols-2 gap-6 px-6 pb-6 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Total rows" value={batch.summary.total.toLocaleString()} />
          <Stat label="Accepted" value={batch.summary.accepted.toLocaleString()} />
          <Stat label="Created" value={batch.summary.created.toLocaleString()} />
          <Stat label="Updated" value={batch.summary.updated.toLocaleString()} />
          <Stat label="Already present" value={batch.summary.alreadyPresent.toLocaleString()} />
          <Stat label="Rejected" value={batch.summary.rejected.toLocaleString()} />
          <Stat label="Duplicates" value={batch.summary.duplicate.toLocaleString()} />
          <Stat label="Conflicts" value={batch.summary.conflict.toLocaleString()} />
          <Stat label="Missing" value={batch.summary.missing.toLocaleString()} />
        </div>
      </Card>

      <Card>
        <CardHeader className="flex-col gap-2">
          <CardTitle>Rows</CardTitle>
          <CardDescription>
            One row per source line with its structured outcome. Raw source JSON is never shown.
          </CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Line</TableHead>
              <TableHead>Star number</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.lineNumber}>
                <TableCell className="text-muted-foreground font-mono text-sm tabular-nums">
                  {row.lineNumber}
                </TableCell>
                <TableCell className="font-mono text-sm font-semibold">
                  {row.number || "—"}
                </TableCell>
                <TableCell>
                  {row.category ? (
                    <Badge variant="outline">{titleCase(row.category)}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {row.status ? (
                    <Badge variant="outline">{titleCase(row.status)}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={resultVariants[row.result]}>{titleCase(row.result)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground max-w-md text-sm">
                  {row.errorMessage ? (
                    <span title={row.errorMessage}>{truncate(row.errorMessage, MAX_ERROR_LENGTH)}</span>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                  No row records stored for this batch.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}