import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/home/section-heading";
import type { StorefrontProduct } from "@/lib/product-utils";

export function ProductRow({
  eyebrow,
  title,
  products,
  viewAllHref,
}: {
  eyebrow: string;
  title: string;
  products: StorefrontProduct[];
  viewAllHref: string;
}) {
  return (
    <section className="mx-auto max-w-[1600px] px-4 py-16 md:px-8 md:py-24">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        link={{ label: "View All", href: viewAllHref }}
      />

      <div className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}
