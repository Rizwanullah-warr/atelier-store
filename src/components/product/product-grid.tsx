import { ProductCard } from "@/components/product/product-card";
import type { StorefrontProduct } from "@/lib/product-utils";

export function ProductGrid({ products }: { products: StorefrontProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      aria-hidden
      className="grid animate-pulse grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4 lg:gap-x-6"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <div className="aspect-[3/4] bg-surface" />
          <div className="mt-4 h-3 w-1/3 bg-surface" />
          <div className="mt-2 h-3 w-2/3 bg-surface" />
        </div>
      ))}
    </div>
  );
}
