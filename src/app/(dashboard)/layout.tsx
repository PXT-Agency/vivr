import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { isCurrentUserPlatformAdmin } from "@/server/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Gate: unauthenticated document requests are redirected to sign-in.
  // (The proxy performs the optimistic cookie check; this is the real
  // server-side validation of the Better Auth session.)
  const session = await auth().getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?redirect=/dashboard");
  }

  const isPlatformAdmin = await isCurrentUserPlatformAdmin();

  return (
    <DashboardShell isPlatformAdmin={isPlatformAdmin} userName={session.user.name || session.user.email}>
      {children}
    </DashboardShell>
  );
}
