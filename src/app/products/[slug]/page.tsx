import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductRow } from "@/components/home/product-row";
import { AddToBag } from "@/components/product/add-to-bag";
import { ProductGallery } from "@/components/product/product-gallery";
import { StockStatus } from "@/components/product/stock-status";
import {
  getAllProductSlugs,
  getProductBySlug,
  getRelatedProducts,
} from "@/db/queries/products";
import { formatPrice } from "@/lib/product-utils";

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/products/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  return {
    title: `${product.name} | Atelier Store`,
    description: product.description,
  };
}

const services = [
  "Complimentary express shipping",
  "Free returns within 30 days",
  "Signature gift packaging",
];

// `params` is URL data, so it is read inside <Suspense>. Known slugs are
// prerendered (generateStaticParams) and never show the fallback on a page
// load; it only covers client navigations to a product not yet prefetched.
export default function ProductPage(props: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={props.params} />
    </Suspense>
  );
}

function ProductSkeleton() {
  return (
    <div
      aria-hidden
      className="mx-auto max-w-[1600px] animate-pulse px-4 md:px-8"
    >
      <div className="py-5">
        <div className="h-3 w-48 bg-surface" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="grid gap-2 lg:grid-cols-2">
          <div className="aspect-[3/4] bg-surface" />
          <div className="hidden aspect-[3/4] bg-surface lg:block" />
        </div>
        <div className="lg:py-6">
          <div className="h-3 w-24 bg-surface" />
          <div className="mt-4 h-10 w-3/4 bg-surface" />
          <div className="mt-5 h-5 w-20 bg-surface" />
          <div className="mt-8 h-28 border-t border-line" />
          <div className="h-12 bg-surface" />
        </div>
      </div>
    </div>
  );
}

async function ProductContent({
  params,
}: {
  params: PageProps<"/products/[slug]">["params"];
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.slug, product.category.slug);

  return (
    <>
      <div className="mx-auto max-w-[1600px] px-4 md:px-8">
        <nav aria-label="Breadcrumb" className="py-5">
          <ol className="label flex flex-wrap items-center gap-2 text-muted">
            <li>
              <Link href="/" className="hover:text-ink">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link
                href={`/shop/${product.category.slug}`}
                className="hover:text-ink"
              >
                {product.category.name}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_480px]">
          <ProductGallery images={product.images} name={product.name} />

          <div className="lg:sticky lg:top-44 lg:self-start lg:py-6">
            <p className="label text-muted">{product.category.name}</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">
              {product.name}
            </h1>
            <p className="mt-4 text-lg">{formatPrice(product.priceCents)}</p>

            <dl className="mt-8 border-t border-line text-sm">
              {product.color && (
                <div className="flex justify-between border-b border-line py-4">
                  <dt className="text-muted">
                    {new Set(product.variants.map((v) => v.color)).size > 1
                      ? "Shown in"
                      : "Colour"}
                  </dt>
                  <dd>{product.color}</dd>
                </div>
              )}
              <div className="flex justify-between border-b border-line py-4">
                <dt className="text-muted">Availability</dt>
                <dd>
                  <StockStatus stock={product.stock} />
                </dd>
              </div>
            </dl>

            <div className="mt-8">
              <AddToBag product={product} />
            </div>

            <p className="mt-8 text-sm leading-relaxed text-muted">
              {product.description}
            </p>

            <div className="mt-8 border-t border-line">
              <details className="group border-b border-line" open>
                <summary className="label flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden justify-between py-5">
                  Details &amp; Care
                  <span className="text-base transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <ul className="space-y-2 pb-6 text-sm text-muted">
                  {product.details.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
              <details className="group border-b border-line">
                <summary className="label flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden justify-between py-5">
                  Delivery &amp; Returns
                  <span className="text-base transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <ul className="space-y-2 pb-6 text-sm text-muted">
                  {services.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
            </div>
          </div>
        </div>
      </div>

      <ProductRow
        eyebrow="Complete the Look"
        title="You May Also Like"
        products={related}
        viewAllHref={`/shop/${product.category.slug}`}
      />
    </>
  );
}
