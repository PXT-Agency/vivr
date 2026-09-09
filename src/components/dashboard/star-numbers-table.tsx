import Link from "next/link";

import {
  STAR_NUMBER_CATEGORIES,
  STAR_NUMBER_STATUSES,
  type StarNumberCategory,
  type StarNumberStatus,
} from "@/config/starNumbers";
import type { StarNumberListing } from "@/server/dashboard/tenant";
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
import { titleCase } from "@/components/dashboard/format";

const statusVariants: Record<
  StarNumberStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  available: "outline",
  reserved: "secondary",
  sold: "default",
  suspended: "destructive",
  released: "secondary",
  retired: "outline",
};

const categoryVariants: Record<StarNumberCategory, "default" | "secondary" | "outline"> = {
  silver: "outline",
  gold: "secondary",
  platinum: "outline",
  diamond: "default",
};

function buildQuery(listing: StarNumberListing, page: number): string {
  const params = new URLSearchParams();
  if (listing.filters.search) params.set("q", listing.filters.search);
  if (listing.filters.category) params.set("category", listing.filters.category);
  if (listing.filters.status) params.set("status", listing.filters.status);
  params.set("page", String(page));
  return `/dashboard/star-numbers?${params.toString()}`;
}

export function StarNumbersTable({ listing }: { listing: StarNumberListing }) {
  const { stars, filters, page, pageSize, total, totalPages, context } = listing;
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Platform inventory</h1>
        <p className="text-muted-foreground text-sm">
          {context.organizationSlug} · {context.organizationRole}. Read-only star-number catalog;
          tenant ownership arrives in a later phase.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-col gap-2">
          <CardTitle>Filters</CardTitle>
          <CardDescription>Server-driven filters; narrowing happens on the server.</CardDescription>
        </CardHeader>
        <form method="get" action="/dashboard/star-numbers" className="flex flex-wrap items-end gap-3 px-6 pb-6">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground text-xs font-medium">Star number (prefix)</span>
            <input
              type="search"
              name="q"
              defaultValue={filters.search}
              placeholder="e.g. 007 or *007"
              className="h-9 w-56 rounded-md border bg-transparent px-3 text-sm transition-colors"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground text-xs font-medium">Category</span>
            <select
              name="category"
              defaultValue={filters.category ?? ""}
              className="h-9 w-40 rounded-md border bg-transparent px-3 text-sm transition-colors"
            >
              <option value="">All categories</option>
              {STAR_NUMBER_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {titleCase(category)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground text-xs font-medium">Status</span>
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className="h-9 w-40 rounded-md border bg-transparent px-3 text-sm transition-colors"
            >
              <option value="">All statuses</option>
              {STAR_NUMBER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {titleCase(status)}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="secondary">
            Apply filters
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard/star-numbers">Clear</Link>
          </Button>
        </form>
      </Card>

      <Card>
        <div className="px-6 pt-6">
          <p className="text-muted-foreground text-sm">
            {total === 0
              ? "No star numbers match the current filters."
              : `Showing ${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()} star numbers.`}
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Star number</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stars.map((star) => (
              <TableRow key={star.id}>
                <TableCell className="font-mono text-sm font-semibold">
                  {star.displayNumber}
                </TableCell>
                <TableCell>
                  <Badge variant={categoryVariants[star.category]}>{titleCase(star.category)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariants[star.status]}>{titleCase(star.status)}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {stars.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground py-8 text-center">
                  No star numbers to display.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <p className="text-muted-foreground text-sm">
            Page {page.toLocaleString()} of {totalPages.toLocaleString()}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildQuery(listing, page - 1)} aria-label="Previous page">
                  Previous
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            )}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildQuery(listing, page + 1)} aria-label="Next page">
                  Next
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}