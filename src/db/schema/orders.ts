import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { productVariants } from "./catalog";

// pending  → checkout started, waiting for Stripe to confirm payment
// paid     → payment confirmed and stock decremented
// refunded → paid, but stock ran out before it could be confirmed; refunded in full
// expired  → the Stripe Checkout session expired without payment
// failed   → the payment failed, or Checkout could not be started
export const ORDER_STATUSES = [
  "pending",
  "paid",
  "refunded",
  "expired",
  "failed",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Delivery progress of a paid order, set by an admin.
export const FULFILLMENT_STATUSES = ["unfulfilled", "shipped", "delivered"] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export type ShippingAddress = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Customer-facing order number (shown as AT-1001).
    number: integer("number")
      .notNull()
      .unique()
      .generatedAlwaysAsIdentity({ startWith: 1001 }),
    // Null for guest checkouts, or if the account is deleted later.
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    // Signed-in customers' email at checkout; replaced by the email Stripe collected once paid.
    email: text("email"),
    status: text("status", { enum: ORDER_STATUSES }).notNull().default("pending"),
    currency: text("currency").notNull().default("usd"),
    // Sum of order items, computed from database prices when checkout starts.
    subtotalCents: integer("subtotal_cents").notNull(),
    // Amount Stripe charged (set when paid).
    totalCents: integer("total_cents"),
    stripeSessionId: text("stripe_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    shippingName: text("shipping_name"),
    shippingAddress: jsonb("shipping_address").$type<ShippingAddress>(),
    // Shown to the customer, e.g. why an order was refunded.
    note: text("note"),
    fulfillmentStatus: text("fulfillment_status", { enum: FULFILLMENT_STATUSES })
      .notNull()
      .default("unfulfilled"),
    fulfillmentUpdatedAt: timestamp("fulfillment_updated_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("orders_user_id_idx").on(table.userId),
    check(
      "orders_status_valid",
      sql`${table.status} in ('pending', 'paid', 'refunded', 'expired', 'failed')`,
    ),
    check("orders_subtotal_non_negative", sql`${table.subtotalCents} >= 0`),
    check(
      "orders_fulfillment_status_valid",
      sql`${table.fulfillmentStatus} in ('unfulfilled', 'shipped', 'delivered')`,
    ),
  ],
);

// A snapshot of what was bought, so order history survives catalog changes.
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // Used to decrement stock; null if the variant is deleted later.
    variantId: uuid("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    sku: text("sku").notNull(),
    productSlug: text("product_slug").notNull(),
    name: text("name").notNull(),
    color: text("color").notNull(),
    size: text("size"),
    image: text("image"),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    // One line per variant: the stock decrement relies on this.
    unique("order_items_order_sku_unique").on(table.orderId, table.sku),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
    check("order_items_unit_price_non_negative", sql`${table.unitPriceCents} >= 0`),
  ],
);

export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  user: one(user, { fields: [orders.userId], references: [user.id] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));
