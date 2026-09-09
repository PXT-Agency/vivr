import { auth } from "@/lib/auth";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
};

export default async function SignUpPage() {
  // Already-authenticated users skip the form.
  const session = await auth().getSession({ headers: await headers() });
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-16">
      <SignUpForm />
    </div>
  );
}
