import Link from "next/link";

import type { VivrList } from "@/server/dashboard/vivr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/components/dashboard/format";

const statusVariants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  published: "default",
  archived: "outline",
};

export function VivrList({ listing }: { listing: VivrList }) {
  const { vivrs } = listing;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">VIVRs</h1>
          <p className="text-muted-foreground text-sm">
            Build and publish a one-page VIVR for your organization. No code required.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/vivr/new">New VIVR</Link>
        </Button>
      </div>

      {vivrs.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm">You haven’t created any VIVRs yet.</p>
            <Button asChild variant="outline">
              <Link href="/dashboard/vivr/new">Create your first VIVR</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {vivrs.map((vivr) => (
            <Card key={vivr.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/vivr/${vivr.id}`}
                      className="hover:underline"
                    >
                      <span className="font-semibold">{vivr.title}</span>
                    </Link>
                    <Badge variant={statusVariants[vivr.status] ?? "secondary"}>
                      {vivr.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground truncate text-sm">
                    /v/{vivr.slug}
                    {vivr.publishedAt
                      ? ` · published ${formatDate(vivr.publishedAt)}`
                      : vivr.draftUpdatedAt
                        ? ` · draft edited ${formatDate(vivr.draftUpdatedAt)}`
                        : ""}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/vivr/${vivr.id}`}>Open builder</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}