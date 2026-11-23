import Link from "next/link";
import { Suspense } from "react";

import { AdminDenied } from "@/components/admin/admin-denied";
import {
  ADMIN_ORDER_FILTERS,
  listAdminOrders,
  type AdminOrderFilter,
} from "@/db/queries/admin";
import { getAdminAccess } from "@/lib/admin";
import {
  FULFILLMENT_LABEL,
  formatOrderDate,
  formatOrderNumber,
  ORDER_STATUS_LABEL,
} from "@/lib/order-format";
import { formatPrice } from "@/lib/product-utils";

export default function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  return (
    <Suspense fallback={<div aria-hidden className="h-96 animate-pulse bg-surface" />}>
      <Orders searchParams={props.searchParams} />
    </Suspense>
  );
}

const isFilter = (value: unknown): value is AdminOrderFilter =>
  typeof value === "string" && value in ADMIN_ORDER_FILTERS;

async function Orders({
  searchParams,
}: {
  searchParams: PageProps<"/admin/orders">["searchParams"];
}) {
  const access = await getAdminAccess();
  if (access.status !== "admin") return <AdminDenied access={access} />;

  const { filter: requested } = await searchParams;
  const filter: AdminOrderFilter = isFilter(requested) ? requested : "paid";
  const orders = await listAdminOrders(filter);

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-4xl md:text-5xl">Orders</h1>

      <ul className="flex flex-wrap gap-2">
        {(Object.keys(ADMIN_ORDER_FILTERS) as AdminOrderFilter[]).map((key) => (
          <li key={key}>
            <Link
              href={key === "paid" ? "/admin/orders" : `/admin/orders?filter=${key}`}
              aria-current={key === filter ? "true" : undefined}
              className={`label inline-flex h-9 items-center border px-4 ${
                key === filter ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"
              }`}
            >
              {ADMIN_ORDER_FILTERS[key].label}
            </Link>
          </li>
        ))}
      </ul>

      {orders.length === 0 ? (
        <p className="text-sm text-muted">No orders here yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-y border-line">
                {["Order", "Date", "Customer", "Pieces", "Total", "Payment", "Delivery"].map(
                  (heading) => (
                    <th key={heading} className="label py-3 pr-4 font-normal text-muted">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="py-3 pr-4">
                    <Link href={`/admin/orders/${order.number}`} className="hover:underline">
                      {formatOrderNumber(order.number)}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-muted">{formatOrderDate(order.createdAt)}</td>
                  <td className="py-3 pr-4">{order.email ?? <span className="text-muted">Unknown</span>}</td>
                  <td className="py-3 pr-4">{order.pieces}</td>
                  <td className="py-3 pr-4">{formatPrice(order.totalCents)}</td>
                  <td className={`py-3 pr-4 ${order.status === "paid" ? "" : "text-muted"}`}>
                    {ORDER_STATUS_LABEL[order.status]}
                  </td>
                  <td className="py-3 pr-4 text-muted">
                    {order.status === "paid" ? FULFILLMENT_LABEL[order.fulfillmentStatus] : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
