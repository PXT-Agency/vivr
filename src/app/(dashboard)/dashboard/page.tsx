import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardHomePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Workspace overview</h1>
        <p className="text-muted-foreground text-sm">
          Authenticated area. Tenant isolation and platform-admin authorization are added in the
          next phase.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Star numbers
            </CardTitle>
            <CardDescription>Inventory status</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              <Badge variant="secondary">Coming soon</Badge>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Reservations
            </CardTitle>
            <CardDescription>Active holds</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              <Badge variant="secondary">Coming soon</Badge>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium">VIVR pages</CardTitle>
            <CardDescription>Builder status</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              <Badge variant="secondary">Coming soon</Badge>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
