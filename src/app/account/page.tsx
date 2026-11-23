import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";

import { AddressBook } from "@/components/account/address-book";
import {
  AuthForms,
  SignOutButton,
  VerifyEmailBanner,
} from "@/components/account/auth-forms";
import { OrderHistory } from "@/components/orders/order-history";
import { listAddresses } from "@/db/queries/account";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Account | Atelier Store",
};

export default function AccountPage(props: PageProps<"/account">) {
  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-24 md:px-8">
      <header className="py-12 text-center md:py-20">
        <p className="label text-muted">My Atelier</p>
        <h1 className="mt-3 font-serif text-5xl md:text-6xl">Account</h1>
      </header>
      {/* The session cookie is request-time data. */}
      <Suspense
        fallback={
          <div className="mx-auto h-80 max-w-md animate-pulse bg-surface" />
        }
      >
        <AccountContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function AccountContent({
  searchParams,
}: {
  searchParams: PageProps<"/account">["searchParams"];
}) {
  const { verified } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return <AuthForms />;

  const { user } = session;
  const addresses = await listAddresses(user.id);
  const memberSince = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(user.createdAt));

  return (
    <div className="mx-auto max-w-4xl">
      {verified === "1" && user.emailVerified && (
        <p
          role="status"
          className="mb-8 border border-line bg-surface p-5 text-sm"
        >
          Thank you, your email address is verified.
        </p>
      )}
      {!user.emailVerified && <VerifyEmailBanner email={user.email} />}
      <div className="grid gap-12 md:grid-cols-2">
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
              <dt className="text-muted">Email status</dt>
              <dd>{user.emailVerified ? "Verified" : "Not verified"}</dd>
            </div>
            <div className="flex justify-between border-b border-line pb-4">
              <dt className="text-muted">Member since</dt>
              <dd>{memberSince}</dd>
            </div>
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            <SignOutButton />
            <Link href="/wishlist" className="btn">
              Wishlist
            </Link>
            {user.role === "admin" && (
              <Link href="/admin" className="btn">
                Store Admin
              </Link>
            )}
          </div>
        </section>

        <section className="border-t border-line pt-6">
          <h2 className="label text-muted">Orders</h2>
          <OrderHistory userId={user.id} />
        </section>

        <section className="border-t border-line pt-6 md:col-span-2">
          <h2 className="label text-muted">Saved Addresses</h2>
          <div className="mt-6">
            <AddressBook initial={addresses} />
          </div>
        </section>
      </div>
    </div>
  );
}
