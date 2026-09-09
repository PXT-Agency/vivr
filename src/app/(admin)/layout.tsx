import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { requirePlatformAdmin } from "@/server/auth";
import { AdminShell } from "@/components/layout/admin-shell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Redirect signed-out users to sign-in; signed-in non-admins fail closed in
  // the error boundary via requirePlatformAdmin.
  const session = await auth().getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in?redirect=/admin/inventory/imports");
  }

  await requirePlatformAdmin();

  return <AdminShell userName={session.user.name || session.user.email}>{children}</AdminShell>;
}
