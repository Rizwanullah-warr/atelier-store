import Image from "next/image";
import Link from "next/link";

import type { OrderDetail } from "@/db/queries/orders";
import {
  countryName,
  formatOrderDate,
  formatOrderNumber,
  orderStatusText,
} from "@/lib/order-format";
import { formatPrice } from "@/lib/product-utils";

// Items, totals and delivery details for one order.
export function OrderDetails({ order }: { order: OrderDetail }) {
  const address = order.shippingAddress;
  const addressLines = address
    ? [
        address.line1,
        address.line2,
        [address.postalCode, address.city].filter(Boolean).join(" "),
        address.state,
        countryName(address.country),
      ].filter(Boolean)
    : [];

  return (
    <div className="space-y-12">
      <dl className="grid grid-cols-2 gap-px border border-line bg-line text-sm md:grid-cols-3">
        <div className="bg-paper p-4">
          <dt className="label text-muted">Order</dt>
          <dd className="mt-2">{formatOrderNumber(order.number)}</dd>
        </div>
        <div className="bg-paper p-4">
          <dt className="label text-muted">Placed</dt>
          <dd className="mt-2">{formatOrderDate(order.paidAt ?? order.createdAt)}</dd>
        </div>
        <div className="col-span-2 bg-paper p-4 md:col-span-1">
          <dt className="label text-muted">Status</dt>
          <dd className="mt-2">{orderStatusText(order)}</dd>
        </div>
      </dl>

      {order.note && (
        <p className="border border-line bg-surface px-4 py-3 text-sm">{order.note}</p>
      )}

      <section aria-label="Items">
        <ul className="divide-y divide-line border-y border-line">
          {order.items.map((item) => (
            <li key={item.sku} className="flex gap-4 py-5">
              <Link
                href={`/products/${item.productSlug}`}
                className="relative aspect-[3/4] w-20 shrink-0 bg-surface"
              >
                {item.image && (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                )}
              </Link>
              <div className="flex flex-1 flex-col gap-1 text-sm">
                <div className="flex justify-between gap-3">
                  <Link href={`/products/${item.productSlug}`} className="hover:underline">
                    {item.name}
                  </Link>
                  <span>{formatPrice(item.unitPriceCents * item.quantity)}</span>
                </div>
                <p className="text-muted">
                  Colour: {item.color}
                  {item.size && <> · Size: {item.size}</>}
                </p>
                <p className="text-muted">
                  Quantity: {item.quantity}
                  {item.quantity > 1 && <> · {formatPrice(item.unitPriceCents)} each</>}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd>{formatPrice(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Shipping</dt>
            <dd>Complimentary</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base">
            <dt>{order.status === "refunded" ? "Refunded" : "Total"}</dt>
            <dd>{formatPrice(order.totalCents ?? order.subtotalCents)}</dd>
          </div>
        </dl>
      </section>

      {(order.shippingName || addressLines.length > 0 || order.email) && (
        <section className="grid gap-8 border-t border-line pt-6 text-sm md:grid-cols-2">
          {(order.shippingName || addressLines.length > 0) && (
            <div>
              <h2 className="label text-muted">Shipping To</h2>
              <address className="mt-3 not-italic leading-relaxed">
                {order.shippingName && <span className="block">{order.shippingName}</span>}
                {addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            </div>
          )}
          {order.email && (
            <div>
              <h2 className="label text-muted">Contact</h2>
              <p className="mt-3">{order.email}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
