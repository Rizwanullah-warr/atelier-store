import Image from "next/image";
import Link from "next/link";

import { getOrderHistory } from "@/db/queries/orders";
import {
  formatOrderDate,
  formatOrderNumber,
  orderStatusText,
} from "@/lib/order-format";
import { formatPrice } from "@/lib/product-utils";

// Orders placed while signed in to this account.
export async function OrderHistory({ userId }: { userId: string }) {
  const orders = await getOrderHistory(userId);

  if (orders.length === 0) {
    return (
      <>
        <p className="mt-6 font-serif text-2xl">No orders yet</p>
        <p className="mt-3 text-sm text-muted">
          Orders you place while signed in will appear here.
        </p>
        <Link href="/new-arrivals" className="btn btn-solid mt-8">
          Shop New In
        </Link>
      </>
    );
  }

  return (
    <ul className="mt-6 divide-y divide-line border-y border-line">
      {orders.map((order) => {
        const pieces = order.items.reduce((sum, item) => sum + item.quantity, 0);
        return (
          <li key={order.id}>
            <Link
              href={`/account/orders/${order.number}`}
              className="group flex items-center gap-4 py-5"
            >
              <div className="relative aspect-[3/4] w-14 shrink-0 bg-surface">
                {order.items[0]?.image && (
                  <Image
                    src={order.items[0].image}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="group-hover:underline">
                    {formatOrderNumber(order.number)}
                  </span>
                  <span>{formatPrice(order.totalCents ?? order.subtotalCents)}</span>
                </div>
                <p className="text-muted">
                  {formatOrderDate(order.paidAt ?? order.createdAt)} · {pieces}{" "}
                  {pieces === 1 ? "piece" : "pieces"}
                </p>
                <p className={order.status === "refunded" ? "text-alert" : "text-muted"}>
                  {orderStatusText(order)}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
