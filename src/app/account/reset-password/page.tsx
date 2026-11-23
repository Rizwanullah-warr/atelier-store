import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/account/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password | Atelier Store",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-24 md:px-8">
      <header className="py-12 text-center md:py-20">
        <p className="label text-muted">My Atelier</p>
        <h1 className="mt-3 font-serif text-5xl md:text-6xl">New Password</h1>
      </header>
      {/* The token comes from the URL, which is request-time data. */}
      <Suspense
        fallback={<div className="mx-auto h-64 max-w-md animate-pulse bg-surface" />}
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
