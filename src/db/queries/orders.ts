import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { pgError } from "@/db/errors";
import {
  orderItems,
  orders,
  productVariants,
  type OrderStatus,
  type ShippingAddress,
} from "@/db/schema";

// Order reads and writes. Orders are per customer, so nothing here is cached.

export type NewOrderItem = {
  variantId: string;
  sku: string;
  productSlug: string;
  name: string;
  color: string;
  size: string | null;
  image: string | null;
  unitPriceCents: number;
  quantity: number;
};

export async function createPendingOrder({
  id,
  userId,
  email,
  items,
}: {
  id: string;
  userId: string | null;
  email: string | null;
  items: NewOrderItem[];
}) {
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  // neon-http has no interactive transactions; a batch runs as one transaction.
  const [[order]] = await db.batch([
    db
      .insert(orders)
      .values({ id, userId, email, subtotalCents })
      .returning({ id: orders.id, number: orders.number }),
    db.insert(orderItems).values(items.map((item) => ({ ...item, orderId: id }))),
  ]);
  return order;
}

export async function attachCheckoutSession(orderId: string, sessionId: string) {
  await db
    .update(orders)
    .set({ stripeSessionId: sessionId })
    .where(eq(orders.id, orderId));
}

// Closes a pending order that will never be paid (expired, failed, not started).
export async function closePendingOrder(
  orderId: string,
  status: Extract<OrderStatus, "expired" | "failed">,
  note?: string,
) {
  await db
    .update(orders)
    .set({ status, note })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")));
}

export type PaymentDetails = {
  email: string | null;
  totalCents: number | null;
  paymentIntentId: string | null;
  shippingName: string | null;
  shippingAddress: ShippingAddress | null;
};

export type MarkPaidResult = "paid" | "already-processed" | "insufficient-stock";

const isStockShortage = (error: unknown) => {
  const info = pgError(error);
  return info?.code === "23514" && info.constraint === "product_variants_stock_non_negative";
};

// Marks a pending order paid and decrements stock for every line, in one SQL
// statement, so it is atomic: if any variant would go below zero, the
// stock_non_negative check fails, the whole statement rolls back and the order
// stays pending. Only a pending order can be claimed, so a payment that is
// confirmed twice (webhook + return page) decrements stock exactly once.
export async function markOrderPaid(
  orderId: string,
  details: PaymentDetails,
): Promise<MarkPaidResult> {
  try {
    const result = await db.execute<{ claimed: number }>(sql`
      with claimed as (
        update ${orders}
           set status = 'paid',
               paid_at = now(),
               updated_at = now(),
               email = coalesce(${details.email}, ${orders.email}),
               total_cents = ${details.totalCents},
               stripe_payment_intent_id = ${details.paymentIntentId},
               shipping_name = ${details.shippingName},
               shipping_address = ${details.shippingAddress ? JSON.stringify(details.shippingAddress) : null}::jsonb
         where ${orders.id} = ${orderId} and ${orders.status} = 'pending'
         returning ${orders.id}
      ), decremented as (
        update ${productVariants}
           set stock = ${productVariants.stock} - ${orderItems.quantity},
               updated_at = now()
          from ${orderItems}
          join claimed on claimed.id = ${orderItems.orderId}
         where ${productVariants.id} = ${orderItems.variantId}
         returning ${productVariants.id}
      )
      select (select count(*) from claimed)::int as claimed,
             (select count(*) from decremented)::int as decremented
    `);
    return result.rows[0]?.claimed ? "paid" : "already-processed";
  } catch (error) {
    if (isStockShortage(error)) return "insufficient-stock";
    throw error;
  }
}

// The payment was taken but the stock is gone; the caller has refunded it.
export async function markOrderRefunded(
  orderId: string,
  details: PaymentDetails,
  note: string,
) {
  await db
    .update(orders)
    .set({
      status: "refunded",
      note,
      email: details.email ?? undefined,
      totalCents: details.totalCents,
      stripePaymentIntentId: details.paymentIntentId,
      shippingName: details.shippingName,
      shippingAddress: details.shippingAddress,
    })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending")));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The order for a Stripe Checkout session: by stored session id, or by the
// order id Stripe echoes back (client_reference_id) if the id was never stored.
export async function findOrderForSession(
  sessionId: string,
  clientReferenceId: string | null,
) {
  const [bySession] = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(eq(orders.stripeSessionId, sessionId))
    .limit(1);
  if (bySession || !clientReferenceId || !UUID.test(clientReferenceId)) {
    return bySession ?? null;
  }

  const [byReference] = await db
    .select({
      id: orders.id,
      status: orders.status,
      stripeSessionId: orders.stripeSessionId,
    })
    .from(orders)
    .where(eq(orders.id, clientReferenceId))
    .limit(1);
  if (!byReference || byReference.stripeSessionId) return null;
  await attachCheckoutSession(byReference.id, sessionId);
  return { id: byReference.id, status: byReference.status };
}

const orderColumns = {
  id: true,
  number: true,
  userId: true,
  email: true,
  status: true,
  currency: true,
  subtotalCents: true,
  totalCents: true,
  shippingName: true,
  shippingAddress: true,
  note: true,
  fulfillmentStatus: true,
  paidAt: true,
  createdAt: true,
} as const;

const itemColumns = {
  sku: true,
  productSlug: true,
  name: true,
  color: true,
  size: true,
  image: true,
  unitPriceCents: true,
  quantity: true,
} as const;

const withItems = () => ({
  items: {
    columns: itemColumns,
    orderBy: [asc(orderItems.name), asc(orderItems.sku)],
  },
});

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderByCheckoutSession>>>;

// For the confirmation page. The session id comes from Stripe's redirect and
// is unguessable, so it identifies the order (guests have no account).
export async function getOrderByCheckoutSession(sessionId: string) {
  return (
    (await db.query.orders.findFirst({
      columns: orderColumns,
      with: withItems(),
      where: eq(orders.stripeSessionId, sessionId),
    })) ?? null
  );
}

// Orders worth showing in an account: ones that were actually paid.
const HISTORY_STATUSES: OrderStatus[] = ["paid", "refunded"];

export async function getOrderHistory(userId: string) {
  return db.query.orders.findMany({
    columns: orderColumns,
    with: withItems(),
    where: and(eq(orders.userId, userId), inArray(orders.status, HISTORY_STATUSES)),
    orderBy: desc(orders.createdAt),
  });
}

export async function getOrderForUser(userId: string, number: number) {
  return (
    (await db.query.orders.findFirst({
      columns: orderColumns,
      with: withItems(),
      where: and(
        eq(orders.userId, userId),
        eq(orders.number, number),
        inArray(orders.status, HISTORY_STATUSES),
      ),
    })) ?? null
  );
}
