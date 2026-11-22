"use client";

import { useCart } from "@/components/cart/cart-context";
import { BagIcon } from "@/components/icons";

export function CartButton() {
  const { count, open, isOpen } = useCart();

  return (
    <button
      type="button"
      onClick={open}
      aria-label={`Shopping bag, ${count} ${count === 1 ? "item" : "items"}`}
      aria-expanded={isOpen}
      className="relative"
    >
      <BagIcon />
      <span className="absolute -right-1.5 -top-1 grid size-4 place-items-center rounded-full bg-ink text-[0.5625rem] text-paper">
        {count}
      </span>
    </button>
  );
}
