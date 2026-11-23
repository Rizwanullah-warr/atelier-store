// Display helpers for orders, safe to import from server and client components.

import type { FulfillmentStatus, OrderStatus } from "@/db/schema/orders";

export const formatOrderNumber = (number: number) => `AT-${number}`;

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  paid: "Confirmed",
  refunded: "Refunded",
  expired: "Not completed",
  failed: "Payment failed",
};

export const formatOrderDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(date);

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export const countryName = (code: string | null) => {
  if (!code) return null;
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};

export const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  unfulfilled: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
};

// Payment status, plus delivery progress once paid: "Confirmed · Shipped".
export const orderStatusText = (order: {
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
}) =>
  order.status === "paid"
    ? `${ORDER_STATUS_LABEL.paid} · ${FULFILLMENT_LABEL[order.fulfillmentStatus]}`
    : ORDER_STATUS_LABEL[order.status];
