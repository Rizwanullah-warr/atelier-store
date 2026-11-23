import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { OpenBagButton } from "@/components/cart/open-bag-button";
import { ClearPurchased } from "@/components/orders/clear-purchased";
import { OrderDetails } from "@/components/orders/order-details";
import { getOrderByCheckoutSession } from "@/db/queries/orders";
import { isCheckoutSessionId } from "@/lib/checkout";
import { formatOrderNumber } from "@/lib/order-format";

export const metadata: Metadata = {
  title: "Order Confirmation | Atelier Store",
  robots: { index: false },
};

export default function CheckoutSuccessPage(props: PageProps<"/checkout/success">) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 md:px-8">
      {/* The session id is in the URL, which is request-time data. */}
      <Suspense fallback={<ConfirmationSkeleton />}>
        <Confirmation searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function ConfirmationSkeleton() {
  return (
    <div aria-hidden className="animate-pulse py-12 text-center md:py-20">
      <div className="mx-auto h-3 w-24 bg-surface" />
      <div className="mx-auto mt-4 h-12 w-80 max-w-full bg-surface" />
      <div className="mt-16 h-64 bg-surface" />
    </div>
  );
}

function Heading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="py-12 text-center md:py-20">
      <p className="label text-muted">{eyebrow}</p>
      <h1 className="mt-3 font-serif text-4xl md:text-6xl">{title}</h1>
      {children && (
        <div className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted">
          {children}
        </div>
      )}
    </header>
  );
}

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

async function Confirmation({
  searchParams,
}: {
  searchParams: PageProps<"/checkout/success">["searchParams"];
}) {
  const sessionId = firstValue((await searchParams).session_id);
  const order = isCheckoutSessionId(sessionId)
    ? await getOrderByCheckoutSession(sessionId)
    : null;

  if (!order) {
    return (
      <>
        <Heading eyebrow="Checkout" title="Order not found">
          We couldn&apos;t find an order for this link. If you were charged, contact us
          with the email you used at checkout.
        </Heading>
        <div className="flex justify-center gap-3">
          <Link href="/info/contact" className="btn">
            Contact Us
          </Link>
          <Link href="/new-arrivals" className="btn btn-solid">
            Continue Shopping
          </Link>
        </div>
      </>
    );
  }

  const number = formatOrderNumber(order.number);

  if (order.status === "pending") {
    return (
      <>
        <Heading eyebrow={number} title="Confirming your payment">
          Stripe is still confirming this payment. This usually takes a few seconds.
          Your bag is unchanged until it is confirmed.
        </Heading>
        <div className="flex justify-center">
          <a
            href={`/api/checkout/complete?session_id=${encodeURIComponent(sessionId!)}`}
            className="btn btn-solid"
          >
            Check Again
          </a>
        </div>
      </>
    );
  }

  if (order.status === "expired" || order.status === "failed") {
    return (
      <>
        <Heading eyebrow={number} title="Payment not completed">
          No payment was taken for this order. Your bag is still saved, so you can try
          again.
        </Heading>
        <div className="flex justify-center gap-3">
          <OpenBagButton />
          <Link href="/new-arrivals" className="btn">
            Continue Shopping
          </Link>
        </div>
      </>
    );
  }

  if (order.status === "refunded") {
    return (
      <>
        <Heading eyebrow={number} title="Your payment was refunded" />
        <OrderDetails order={order} />
        <div className="mt-12 flex justify-center gap-3">
          <OpenBagButton />
          <Link href="/new-arrivals" className="btn">
            Continue Shopping
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <ClearPurchased orderId={order.id} skus={order.items.map((item) => item.sku)} />
      <Heading eyebrow="Thank You" title="Your order is confirmed">
        Order {number} is being prepared for complimentary express shipping.
        Confirmation emails are not set up yet, so please keep this page for your
        records.
      </Heading>
      <OrderDetails order={order} />
      <div className="mt-12 flex flex-wrap justify-center gap-3">
        {order.userId && (
          <Link href={`/account/orders/${order.number}`} className="btn">
            View in Your Account
          </Link>
        )}
        <Link href="/new-arrivals" className="btn btn-solid">
          Continue Shopping
        </Link>
      </div>
    </>
  );
}
