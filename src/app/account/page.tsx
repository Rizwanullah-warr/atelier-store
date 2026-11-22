import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";

import { AuthForms, SignOutButton } from "@/components/account/auth-forms";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Account | Atelier Store",
};

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-24 md:px-8">
      <header className="py-12 text-center md:py-20">
        <p className="label text-muted">My Atelier</p>
        <h1 className="mt-3 font-serif text-5xl md:text-6xl">Account</h1>
      </header>
      {/* The session cookie is request-time data. */}
      <Suspense fallback={<div className="mx-auto h-80 max-w-md animate-pulse bg-surface" />}>
        <AccountContent />
      </Suspense>
    </div>
  );
}

async function AccountContent() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return <AuthForms />;

  const { user } = session;
  const memberSince = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(user.createdAt));

  return (
    <div className="mx-auto grid max-w-4xl gap-12 md:grid-cols-2">
      <section className="border-t border-line pt-6">
        <h2 className="label text-muted">Profile</h2>
        <dl className="mt-6 space-y-4 text-sm">
          <div className="flex justify-between border-b border-line pb-4">
            <dt className="text-muted">Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div className="flex justify-between border-b border-line pb-4">
            <dt className="text-muted">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between border-b border-line pb-4">
            <dt className="text-muted">Member since</dt>
            <dd>{memberSince}</dd>
          </div>
        </dl>
        <div className="mt-8">
          <SignOutButton />
        </div>
      </section>

      <section className="border-t border-line pt-6">
        <h2 className="label text-muted">Orders</h2>
        <p className="mt-6 font-serif text-2xl">No orders yet</p>
        <p className="mt-3 text-sm text-muted">
          Online checkout is not available yet, so orders cannot be placed. Items you
          add to your bag are saved in this browser.
        </p>
        <Link href="/shop/new-in" className="btn btn-solid mt-8">
          Shop New In
        </Link>
      </section>
    </div>
  );
}
