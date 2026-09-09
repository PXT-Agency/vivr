"use client";

import Link from "next/link";
import { Star, LayoutDashboard, ShieldCheck, Palette } from "lucide-react";

import { OrganizationSwitcher } from "@/components/auth/organization-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/vivr", label: "VIVRs", icon: Palette },
  { href: "/dashboard/star-numbers", label: "Star numbers", icon: Star },
];

const adminNavItem = { href: "/admin/inventory/imports", label: "Platform admin", icon: ShieldCheck };

export function DashboardShell({
  children,
  isPlatformAdmin = false,
  userName,
}: Readonly<{
  children: React.ReactNode;
  isPlatformAdmin?: boolean;
  userName?: string | null;
}>) {
  return (
    <div className="flex min-h-svh w-full">
      <aside className="bg-card hidden w-64 shrink-0 border-r md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Star aria-hidden="true" className="text-primary size-5" />
          <span className="font-semibold tracking-tight">VIVR</span>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
            >
              <item.icon aria-hidden="true" className="size-4" />
              {item.label}
            </Link>
          ))}
          {isPlatformAdmin ? (
            <Link
              href={adminNavItem.href}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
            >
              <adminNavItem.icon aria-hidden="true" className="size-4" />
              {adminNavItem.label}
            </Link>
          ) : null}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background sticky top-0 z-10 flex h-16 items-center gap-4 border-b px-6">
          <div className="font-medium">Dashboard</div>
          <div className="relative ml-auto flex items-center gap-4">
            <OrganizationSwitcher redirectTo="/dashboard" />
            {userName ? (
              <span className="text-muted-foreground max-w-40 truncate text-sm" title={userName}>
                {userName}
              </span>
            ) : null}
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
