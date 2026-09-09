import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold tracking-tight">Import batch not found</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        The selected import batch does not exist or is no longer available.
      </p>
      <Button asChild variant="outline">
        <Link href="/admin/inventory/imports">Back to import batches</Link>
      </Button>
    </div>
  );
}