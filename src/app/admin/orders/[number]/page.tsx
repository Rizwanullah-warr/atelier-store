import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AdminDenied } from "@/components/admin/admin-denied";
import { FulfillmentForm } from "@/components/admin/fulfillment-form";
import { OrderDetails } from "@/components/orders/order-details";
import { getAdminOrder } from "@/db/queries/admin";
import { getAdminAccess } from "@/lib/admin";
import { formatOrderNumber } from "@/lib/order-format";
import { getPaymentMode } from "@/lib/stripe";

export default function AdminOrderPage(props: PageProps<"/admin/orders/[number]">) {
  return (
    <Suspense fallback={<div aria-hidden className="h-96 animate-pulse bg-surface" />}>
      <AdminOrder params={props.params} />
    </Suspense>
  );
}

async function AdminOrder({
  params,
}: {
  params: PageProps<"/admin/orders/[number]">["params"];
}) {
  const access = await getAdminAccess();
  if (access.status !== "admin") return <AdminDenied access={access} />;

  const { number } = await params;
  const order = /^\d{1,9}$/.test(number) ? await getAdminOrder(Number(number)) : null;
  if (!order) notFound();

  // Link straight to the payment in the Stripe Dashboard (test or live).
  const stripeUrl =
    order.stripePaymentIntentId && getPaymentMode()
      ? `https://dashboard.stripe.com/${getPaymentMode() === "test" ? "test/" : ""}payments/${order.stripePaymentIntentId}`
      : null;

  return (
    <div className="max-w-3xl space-y-10">
      <div className="space-y-6">
        <nav aria-label="Breadcrumb">
          <ol className="label flex items-center gap-2 text-muted">
            <li>
              <Link href="/admin/orders" className="hover:text-ink">
                Orders
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink">
              {formatOrderNumber(order.number)}
            </li>
          </ol>
        </nav>
        <h1 className="font-serif text-4xl md:text-5xl">{formatOrderNumber(order.number)}</h1>
      </div>

      <section className="grid gap-6 border-y border-line py-6 text-sm md:grid-cols-2">
        <div>
          <h2 className="label text-muted">Customer</h2>
          <p className="mt-3">
            {order.account
              ? `${order.account.name} (account: ${order.account.email})`
              : "Guest checkout"}
          </p>
        </div>
        <div>
          <h2 className="label text-muted">Payment</h2>
          <p className="mt-3 break-all">
            {stripeUrl ? (
              <a href={stripeUrl} target="_blank" rel="noreferrer" className="link-underline">
                View in Stripe
              </a>
            ) : (
              <span className="text-muted">
                {order.stripePaymentIntentId ?? "No Stripe payment recorded"}
              </span>
            )}
          </p>
        </div>
      </section>

      {order.status === "paid" ? (
        <FulfillmentForm orderId={order.id} status={order.fulfillmentStatus} />
      ) : (
        <p className="text-sm text-muted">
          Delivery status applies to paid orders only.
        </p>
      )}

      <OrderDetails order={order} />
    </div>
  );
}
