import Link from "next/link";
import { Suspense } from "react";

import { AdminDenied } from "@/components/admin/admin-denied";
import { getAdminStats } from "@/db/queries/admin";
import { getAdminAccess } from "@/lib/admin";
import {
  FULFILLMENT_LABEL,
  formatOrderDate,
  formatOrderNumber,
} from "@/lib/order-format";
import { formatPrice, getStockState } from "@/lib/product-utils";

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<div aria-hidden className="h-96 animate-pulse bg-surface" />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const access = await getAdminAccess();
  if (access.status !== "admin") return <AdminDenied access={access} />;

  const stats = await getAdminStats();
  const tiles = [
    { label: "Products", value: String(stats.products), href: "/admin/products" },
    { label: "Paid Orders", value: String(stats.paidOrders), href: "/admin/orders" },
    { label: "To Ship", value: String(stats.ordersToShip), href: "/admin/orders" },
    { label: "Revenue", value: formatPrice(stats.revenueCents), href: "/admin/orders" },
    { label: "Low Stock", value: String(stats.lowStockVariants), href: "/admin/products" },
    { label: "Sold Out", value: String(stats.soldOutVariants), href: "/admin/products" },
  ];

  return (
    <div className="space-y-14">
      <h1 className="font-serif text-4xl md:text-5xl">Overview</h1>

      <dl className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="bg-paper p-5 hover:bg-surface">
            <dt className="label text-muted">{tile.label}</dt>
            <dd className="mt-3 font-serif text-3xl">{tile.value}</dd>
          </Link>
        ))}
      </dl>

      <div className="grid gap-14 lg:grid-cols-2">
        <section>
          <h2 className="label text-muted">Low and Sold-Out Stock</h2>
          {stats.lowStock.length === 0 ? (
            <p className="mt-6 text-sm text-muted">Every variant has more than 3 in stock.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
              {stats.lowStock.map((item) => (
                <li key={`${item.productId}-${item.color}-${item.size}`}>
                  <Link
                    href={`/admin/products/${item.productId}`}
                    className="flex justify-between gap-4 py-3 hover:underline"
                  >
                    <span>
                      {item.name}
                      <span className="text-muted">
                        {" "}
                        · {[item.color, item.size].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span
                      className={
                        getStockState(item.stock) === "sold-out" ? "text-muted" : "text-alert"
                      }
                    >
                      {item.stock === 0 ? "Sold out" : `${item.stock} left`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="label text-muted">Recent Paid Orders</h2>
          {stats.recentOrders.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No paid orders yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
              {stats.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.number}`}
                    className="flex justify-between gap-4 py-3 hover:underline"
                  >
                    <span>
                      {formatOrderNumber(order.number)}
                      <span className="text-muted"> · {formatOrderDate(order.createdAt)}</span>
                    </span>
                    <span>
                      {formatPrice(order.totalCents)}
                      <span className="text-muted">
                        {" "}
                        · {FULFILLMENT_LABEL[order.fulfillmentStatus]}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
