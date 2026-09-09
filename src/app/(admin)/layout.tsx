import { auth } from "@clerk/nextjs/server";

import { requirePlatformAdmin } from "@/server/auth";
import { AdminShell } from "@/components/layout/admin-shell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Redirect signed-out users to sign-in; signed-in non-admins fail closed in
  // the error boundary via requirePlatformAdmin.
  await auth.protect();
  await requirePlatformAdmin();

  return <AdminShell>{children}</AdminShell>;
}