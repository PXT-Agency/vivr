import { auth } from "@clerk/nextjs/server";

import { isCurrentUserPlatformAdmin } from "@/server/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isPlatformAdmin] = await Promise.all([
    isCurrentUserPlatformAdmin(),
    auth.protect(),
  ]);

  return <DashboardShell isPlatformAdmin={isPlatformAdmin}>{children}</DashboardShell>;
}