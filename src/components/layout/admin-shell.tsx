"use client";

import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";

import { OrganizationSwitcher } from "@/components/auth/organization-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";

const navItems = [
  { href: "/admin/inventory/imports", label: "Import batches", icon: ShieldCheck },
  { href: "/dashboard", label: "Back to dashboard", icon: ArrowLeft },
];

export function AdminShell({
  children,
  userName,
}: Readonly<{
  children: React.ReactNode;
  userName?: string | null;
}>) {
  return (
    <div className="flex min-h-svh w-full">
      <aside className="bg-card hidden w-64 shrink-0 border-r md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <ShieldCheck aria-hidden="true" className="text-primary size-5" />
          <span className="font-semibold tracking-tight">Platform admin</span>
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
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background sticky top-0 z-10 flex h-16 items-center gap-4 border-b px-6">
          <div className="font-medium">Platform inventory</div>
          <div className="relative ml-auto flex items-center gap-4">
            <OrganizationSwitcher redirectTo="/admin/inventory/imports" />
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
