"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { useCart } from "@/components/cart/cart-context";
import { CloseIcon } from "@/components/icons";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import { formatPrice } from "@/lib/product-utils";

export function CartDrawer() {
  const { items, count, subtotalCents, isOpen, close, updateQuantity, removeItem } =
    useCart();

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  // Portal to body: the sticky header's backdrop-filter would trap a fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close bag"
        onClick={close}
        className="absolute inset-0 bg-ink/40"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-paper"
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-6">
          <h2 className="label">
            Shopping Bag ({count})
          </h2>
          <button type="button" aria-label="Close bag" onClick={close}>
            <CloseIcon />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
            <p className="font-serif text-3xl">Your bag is empty</p>
            <Link href="/shop/new-in" onClick={close} className="btn btn-solid">
              Shop New In
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
              {items.map((item) => (
                <li key={`${item.slug}-${item.size}`} className="flex gap-4 py-6">
                  <Link
                    href={`/products/${item.slug}`}
                    onClick={close}
                    className="relative aspect-[3/4] w-24 shrink-0 bg-surface"
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-3">
                      <Link
                        href={`/products/${item.slug}`}
                        onClick={close}
                        className="text-sm hover:underline"
                      >
                        {item.name}
                      </Link>
                      <p className="text-sm">
                        {formatPrice(item.priceCents * item.quantity)}
                      </p>
                    </div>
                    {item.size && (
                      <p className="mt-1 text-sm text-muted">Size: {item.size}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <QuantityStepper
                        value={item.quantity}
                        max={item.maxQuantity}
                        label={item.name}
                        onChange={(quantity) =>
                          updateQuantity(item.slug, item.size, quantity)
                        }
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.slug, item.size)}
                        className="label link-underline text-muted"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-line px-6 py-6">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatPrice(subtotalCents)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Shipping and taxes are calculated at checkout.
              </p>
              <button type="button" disabled className="btn btn-solid mt-6 w-full">
                Checkout Unavailable
              </button>
              <p className="mt-3 text-center text-xs text-muted">
                Online payment is not set up yet. Your bag is saved in this browser.
              </p>
            </div>
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}
