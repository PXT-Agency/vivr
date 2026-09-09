"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

/**
 * Sign-out button. Invalidates the Better Auth session server-side and
 * returns to the public home. The sign-in page is public.
 */
export function SignOutButton({ label = "Sign out" }: { label?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onSignOut}
      disabled={pending}
      className="gap-1.5"
    >
      <LogOut aria-hidden="true" className="size-4" />
      {pending ? "Signing out…" : label}
    </Button>
  );
}
