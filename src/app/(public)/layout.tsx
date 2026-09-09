import Link from "next/link";
import { headers } from "next/headers";
import { Star } from "lucide-react";

import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth().getSession({ headers: await headers() });

  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-background sticky top-0 z-10 border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Star aria-hidden="true" className="text-primary size-5" />
            <span>VIVR</span>
          </Link>
          <nav className="text-muted-foreground ml-auto flex items-center gap-4 text-sm">
            {session ? (
              <>
                <span className="text-foreground text-sm font-medium">
                  {session.user.name || session.user.email}
                </span>
                <Link
                  href="/dashboard"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <SignOutButton />
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition-colors hover:text-foreground"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex h-16 w-full max-w-6xl items-center px-4 text-sm sm:px-6">
          <span>VIVR — OSSK star-number inventory platform.</span>
        </div>
      </footer>
    </div>
  );
}
