import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { OrderDetails } from "@/components/orders/order-details";
import { getOrderForUser } from "@/db/queries/orders";
import { auth } from "@/lib/auth";
import { formatOrderNumber } from "@/lib/order-format";

export const metadata: Metadata = {
  title: "Order | Atelier Store",
  robots: { index: false },
};

export default function AccountOrderPage(props: PageProps<"/account/orders/[number]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 md:px-8">
      {/* The session cookie and the order number are request-time data. */}
      <Suspense
        fallback={<div aria-hidden className="mt-24 h-96 animate-pulse bg-surface" />}
      >
        <OrderContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function OrderContent({
  params,
}: {
  params: PageProps<"/account/orders/[number]">["params"];
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return (
      <header className="py-12 text-center md:py-20">
        <p className="label text-muted">Orders</p>
        <h1 className="mt-3 font-serif text-4xl md:text-6xl">Sign in to view this order</h1>
        <Link href="/account" className="btn btn-solid mt-8">
          Sign In
        </Link>
      </header>
    );
  }

  const { number } = await params;
  // Only the owner's orders are found, so another customer's order is a 404.
  const order = /^\d{1,9}$/.test(number)
    ? await getOrderForUser(session.user.id, Number(number))
    : null;
  if (!order) notFound();

  return (
    <>
      <nav aria-label="Breadcrumb" className="py-5">
        <ol className="label flex items-center gap-2 text-muted">
          <li>
            <Link href="/account" className="hover:text-ink">
              Account
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink">
            {formatOrderNumber(order.number)}
          </li>
        </ol>
      </nav>
      <header className="pb-10 pt-4">
        <p className="label text-muted">Order</p>
        <h1 className="mt-3 font-serif text-4xl md:text-6xl">
          {formatOrderNumber(order.number)}
        </h1>
      </header>
      <OrderDetails order={order} />
    </>
  );
}
