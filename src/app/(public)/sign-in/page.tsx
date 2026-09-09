import { auth } from "@/lib/auth";
import { SignInForm } from "@/components/auth/sign-in-form";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function SignInPage() {
  // Already-authenticated users skip the form.
  const session = await auth().getSession({ headers: await headers() });
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-16">
      <SignInForm />
    </div>
  );
}
