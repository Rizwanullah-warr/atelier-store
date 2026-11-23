import Image from "next/image";
import Link from "next/link";

import { WishlistButton } from "@/components/wishlist/wishlist-button";

import {
  formatPrice,
  getStockState,
  type StorefrontProduct,
} from "@/lib/product-utils";

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const soldOut = getStockState(product.stock) === "sold-out";
  const badge = soldOut ? "Sold Out" : product.isNew ? "New" : null;

  return (
    <div className="relative">
      <Link href={`/products/${product.slug}`} className="group block">
        <div className="relative aspect-[3/4] overflow-hidden bg-surface">
          {product.images[0] && (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className={`object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] ${soldOut ? "opacity-60" : ""}`}
            />
          )}
          {badge && (
            <span className="label absolute left-3 top-3 bg-paper px-2 py-1 text-[0.5625rem]">
              {badge}
            </span>
          )}
        </div>
        <div className="mt-4 space-y-1">
          <p className="label text-muted">{product.category.name}</p>
          <h3 className="text-sm">{product.name}</h3>
          <p className="text-sm text-muted">
            {formatPrice(product.priceCents)}
          </p>
        </div>
      </Link>
      <WishlistButton slug={product.slug} name={product.name} />
    </div>
  );
}
