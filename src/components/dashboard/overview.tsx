import Link from "next/link";
import { ArrowRight, Database } from "lucide-react";

import type { DashboardOverview } from "@/server/dashboard/tenant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { titleCase } from "@/components/dashboard/format";

export function DashboardOverview({ overview }: { overview: DashboardOverview }) {
  const { organization, starNumbers, context } = overview;
  const displayName = organization?.name ?? organization?.slug ?? context.organizationSlug;
  const categoryCards = [
    { key: "silver" as const, description: "Entry-level inventory" },
    { key: "gold" as const, description: "Premium inventory" },
    { key: "platinum" as const, description: "High-demand inventory" },
    { key: "diamond" as const, description: "Rare inventory" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {displayName ?? "Workspace overview"}
          </h1>
          <Badge variant="outline" className="gap-1">
            <Database aria-hidden="true" className="size-3" />
            Platform inventory
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          {organization
            ? `${organization.name} · ${organization.slug} · ${context.organizationRole}`
            : `Signed in as ${context.organizationRole}.`}
          The star-number catalog is platform-level; tenant ownership arrives in a later phase.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Star numbers
            </CardTitle>
            <CardDescription>Total in inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{starNumbers.total.toLocaleString()}</p>
          </CardContent>
        </Card>
        {categoryCards.map((card) => (
          <Card key={card.key}>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {titleCase(card.key)}
              </CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {starNumbers.byCategory[card.key].toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <Button asChild variant="outline">
          <Link href="/dashboard/star-numbers">
            Browse platform inventory
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}