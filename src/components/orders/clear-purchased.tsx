"use client";

import { useEffect } from "react";

import { useCart } from "@/components/cart/cart-context";

const CLEARED_KEY = "atelier-cleared-orders";

// After a confirmed order, removes the purchased pieces from the bag once,
// so revisiting the confirmation page later does not touch a newer bag.
export function ClearPurchased({ orderId, skus }: { orderId: string; skus: string[] }) {
  const { ready, removeItems } = useCart();

  useEffect(() => {
    // Child effects run before the provider's, so wait until the bag is loaded.
    if (!ready) return;
    let cleared: string[] = [];
    try {
      cleared = JSON.parse(localStorage.getItem(CLEARED_KEY) ?? "[]");
    } catch {
      // Unreadable storage: clearing again is harmless.
    }
    if (Array.isArray(cleared) && cleared.includes(orderId)) return;

    removeItems(skus);
    try {
      localStorage.setItem(
        CLEARED_KEY,
        JSON.stringify([...(Array.isArray(cleared) ? cleared : []), orderId].slice(-20)),
      );
    } catch {
      // Storage unavailable (private mode): nothing to remember.
    }
  }, [ready, orderId, skus, removeItems]);

  return null;
}
