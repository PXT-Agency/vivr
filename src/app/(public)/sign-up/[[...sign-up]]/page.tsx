import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-16">
      <SignUp />
    </div>
  );
}
