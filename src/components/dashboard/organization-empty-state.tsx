import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function OrganizationEmptyState() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>No active organization</CardTitle>
          <CardDescription>
            Select or create an organization from the switcher above to activate your
            workspace. Every organization sees only its own tenant context.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}