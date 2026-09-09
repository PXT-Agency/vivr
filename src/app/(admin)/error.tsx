"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold tracking-tight">Platform admin access required</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        This area is restricted to platform administrators. If you believe this is an error, sign
        in as a user with the platform-admin role and try again.
      </p>
      <Button onClick={() => reset()} variant="outline">
        Try again
      </Button>
    </div>
  );
}