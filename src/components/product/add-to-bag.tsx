"use client";

import { useState } from "react";

import { useCart } from "@/components/cart/cart-context";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import { StockStatus } from "@/components/product/stock-status";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import type { ProductDetail } from "@/lib/product-utils";

export function AddToBag({ product }: { product: ProductDetail }) {
  const { items, addItem } = useCart();

  // Colours in display order, with their swatch and whether any size is left.
  const colors = product.variants.reduce<
    { name: string; hex: string | null; inStock: boolean }[]
  >((list, variant) => {
    const existing = list.find((color) => color.name === variant.color);
    if (existing) existing.inStock ||= variant.stock > 0;
    else
      list.push({
        name: variant.color,
        hex: variant.colorHex,
        inStock: variant.stock > 0,
      });
    return list;
  }, []);

  // Start on the photographed colour, else the first one with stock.
  const [color, setColor] = useState(
    () =>
      colors.find((option) => option.name === product.color)?.name ??
      colors.find((option) => option.inStock)?.name ??
      colors[0]?.name ??
      "",
  );
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const colorVariants = product.variants.filter((v) => v.color === color);
  const needsSize = colorVariants.some((variant) => variant.size !== null);
  const variant = needsSize
    ? colorVariants.find((v) => v.size === size)
    : colorVariants[0];
  const inBag = variant
    ? (items.find((item) => item.sku === variant.sku)?.quantity ?? 0)
    : 0;
  const available = variant ? Math.max(0, variant.stock - inBag) : 0;
  const showColors = colors.length > 1;
  const showVariantStock = variant && (needsSize || showColors);

  const chooseColor = (next: string) => {
    setColor(next);
    setError(null);
    // Keep the size if it can still be bought in the new colour.
    const sameSize = product.variants.find(
      (v) => v.color === next && v.size === size,
    );
    if (!sameSize || sameSize.stock === 0) setSize(null);
  };

  const handleAdd = () => {
    if (!variant) {
      setError("Please select a size.");
      return;
    }
    if (variant.stock === 0) {
      setError("This option is sold out.");
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
        sku: variant.sku,
        slug: product.slug,
        name: product.name,
        image: product.images[0] ?? "",
        priceCents: product.priceCents,
        color: variant.color,
        size: variant.size,
        maxQuantity: variant.stock,
      },
      quantity,
    );
    setQuantity(1);
  };

  if (product.stock === 0) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3">
          <button type="button" disabled className="btn btn-solid flex-1">
            Sold Out
          </button>
          <WishlistButton slug={product.slug} name={product.name} variant="page" />
        </div>
        <p className="text-center text-sm text-muted">
          This piece is currently unavailable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showColors && (
        <fieldset>
          <legend className="label mb-3 flex w-full justify-between">
            <span>Colour</span>
            <span className="text-muted">{color}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((option) => (
              <button
                key={option.name}
                type="button"
                aria-pressed={color === option.name}
                aria-label={`${option.name}${option.inStock ? "" : ", sold out"}`}
                title={option.name}
                onClick={() => chooseColor(option.name)}
                className={`relative grid size-10 place-items-center border transition-colors ${
                  color === option.name
                    ? "border-ink"
                    : "border-line hover:border-ink"
                }`}
              >
                <span
                  aria-hidden
                  className="size-7 border border-line"
                  style={{ backgroundColor: option.hex ?? undefined }}
                />
                {!option.inStock && (
                  <span
                    aria-hidden
                    className="absolute inset-0 m-auto h-px w-[140%] -rotate-45 bg-muted"
                  />
                )}
              </button>
            ))}
          </div>
          {color !== product.color && product.color && (
            <p className="mt-3 text-xs text-muted">
              Photographed in {product.color}.
            </p>
          )}
        </fieldset>
      )}

      {needsSize && (
        <fieldset>
          <legend className="label mb-3 flex w-full justify-between">
            <span>Size</span>
            {size && <span className="text-muted">Selected: {size}</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {colorVariants.map((option) => {
              const soldOut = option.stock === 0;
              return (
                <button
                  key={option.sku}
                  type="button"
                  aria-pressed={size === option.size}
                  aria-label={soldOut ? `${option.size}, sold out` : undefined}
                  disabled={soldOut}
                  onClick={() => {
                    setSize(option.size);
                    setError(null);
                  }}
                  className={`h-10 min-w-12 border px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:line-through ${
                    size === option.size
                      ? "border-ink bg-ink text-paper"
                      : "border-line hover:border-ink"
                  }`}
                >
                  {option.size}
                </button>
              );
            })}
          </div>
          {colorVariants.every((option) => option.stock === 0) && (
            <p className="mt-3 text-sm text-muted">
              Sold out in {color}. Try another colour.
            </p>
          )}
        </fieldset>
      )}

      {showVariantStock && (
        <div className="flex items-center justify-between border-y border-line py-3 text-sm">
          <span className="text-muted">
            {[variant.color, variant.size].filter(Boolean).join(" · ")}
          </span>
          <StockStatus stock={variant.stock} />
        </div>
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
        <div className="flex gap-3">
          <button type="button" onClick={handleAdd} className="btn btn-solid flex-1">
            Add to Bag
          </button>
          <WishlistButton slug={product.slug} name={product.name} variant="page" />
        </div>
        {error && (
          <p role="alert" className="text-sm text-alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
