"use client";

import { useState } from "react";

import { useCart } from "@/components/cart/cart-context";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import type { StorefrontProduct } from "@/lib/product-utils";

export function AddToBag({ product }: { product: StorefrontProduct }) {
  const { items, addItem } = useCart();
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const needsSize = product.sizes.length > 0;
  const soldOut = product.stock === 0;
  // Stock is shared across sizes, so count every line of this product already in the bag.
  const inBag = items
    .filter((item) => item.slug === product.slug)
    .reduce((sum, item) => sum + item.quantity, 0);
  const available = Math.max(0, product.stock - inBag);

  const handleAdd = () => {
    if (needsSize && !size) {
      setError("Please select a size.");
      return;
    }
    if (quantity > available) {
      setError(
        available === 0
          ? "You already have all available stock in your bag."
          : `Only ${available} more available.`,
      );
      return;
    }
    setError(null);
    addItem(
      {
        slug: product.slug,
        name: product.name,
        image: product.images[0] ?? "",
        priceCents: product.priceCents,
        size: needsSize ? size : null,
        maxQuantity: product.stock,
      },
      quantity,
    );
    setQuantity(1);
  };

  if (soldOut) {
    return (
      <div className="space-y-3">
        <button type="button" disabled className="btn btn-solid w-full">
          Sold Out
        </button>
        <p className="text-center text-sm text-muted">
          This piece is currently unavailable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {needsSize && (
        <fieldset>
          <legend className="label mb-3 flex w-full justify-between">
            <span>Size</span>
            {size && <span className="text-muted">Selected: {size}</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={size === option}
                onClick={() => {
                  setSize(option);
                  setError(null);
                }}
                className={`h-10 min-w-12 border px-3 text-sm transition-colors ${
                  size === option
                    ? "border-ink bg-ink text-paper"
                    : "border-line hover:border-ink"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex items-center gap-4">
        <span className="label">Quantity</span>
        <QuantityStepper
          value={quantity}
          max={Math.max(1, available)}
          label={product.name}
          onChange={setQuantity}
        />
      </div>

      <div className="space-y-3">
        <button type="button" onClick={handleAdd} className="btn btn-solid w-full">
          Add to Bag
        </button>
        {error && (
          <p role="alert" className="text-sm text-alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
