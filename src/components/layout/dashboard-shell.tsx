import Link from "next/link";
import { Star, LayoutDashboard, ShieldCheck } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/star-numbers", label: "Star numbers", icon: Star },
  { href: "/dashboard/admin", label: "Platform admin", icon: ShieldCheck },
];

export function DashboardShell({
  children,
}: Readonly<{
  children: React.ReactNode;
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
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background sticky top-0 z-10 flex h-16 items-center gap-4 border-b px-6">
          <div className="font-medium">Dashboard</div>
          <div className="text-muted-foreground ml-auto text-sm">Signed in workspace</div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
