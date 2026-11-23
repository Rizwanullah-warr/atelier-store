"use client";

import { useCart } from "@/components/cart/cart-context";

export function OpenBagButton({ className = "btn btn-solid" }: { className?: string }) {
  const { open } = useCart();
  return (
    <button type="button" onClick={open} className={className}>
      Return to Bag
    </button>
  );
}
