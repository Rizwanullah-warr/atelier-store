import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { SectionHeading } from "@/components/home/section-heading";
import { ProductGrid } from "@/components/product/product-grid";
import { StockStatus } from "@/components/product/stock-status";
import { getNewArrivals } from "@/db/queries/products";
import { formatPrice } from "@/lib/product-utils";

export const metadata: Metadata = {
  title: "New Arrivals | Atelier Store",
  description: "The latest pieces added to the Atelier collection.",
};

// The newest piece is featured; the rest follow in arrival order.
const LATEST_COUNT = 13;

export default async function NewArrivalsPage() {
  const [featured, ...latest] = await getNewArrivals(LATEST_COUNT);

  return (
    <>
      <div className="mx-auto max-w-[1600px] px-4 md:px-8">
        <nav aria-label="Breadcrumb" className="py-5">
          <ol className="label flex items-center gap-2 text-muted">
            <li>
              <Link href="/" className="hover:text-ink">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink">
              New Arrivals
            </li>
          </ol>
        </nav>

        <header className="pb-10 pt-4 md:pb-14">
          <p className="label text-muted">Just In</p>
          <h1 className="mt-3 font-serif text-5xl md:text-7xl">New Arrivals</h1>
          <p className="mt-4 max-w-xl text-sm text-muted md:text-base">
            The latest pieces to arrive in the atelier, newest first.
          </p>
        </header>
      </div>

      {featured ? (
        <section
          aria-labelledby="latest-arrival"
          className="border-y border-line bg-surface"
        >
          <div className="mx-auto grid max-w-[1600px] md:grid-cols-2">
            <Link
              href={`/products/${featured.slug}`}
              className="group relative block aspect-[4/5] overflow-hidden md:aspect-auto md:min-h-[720px]"
            >
              {featured.images[0] && (
                <Image
                  src={featured.images[0]}
                  alt={featured.name}
                  fill
                  preload
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.03]"
                />
              )}
            </Link>

            <div className="flex flex-col justify-center px-4 py-12 md:px-16 md:py-20">
              <p className="label text-muted">Latest Arrival</p>
              <h2
                id="latest-arrival"
                className="mt-4 font-serif text-4xl leading-tight md:text-6xl"
              >
                {featured.name}
              </h2>
              <p className="label mt-5 text-muted">{featured.category.name}</p>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">
                {featured.description}
              </p>

              <dl className="mt-8 max-w-md border-t border-line text-sm">
                <div className="flex justify-between border-b border-line py-4">
                  <dt className="text-muted">Price</dt>
                  <dd>{formatPrice(featured.priceCents)}</dd>
                </div>
                <div className="flex justify-between border-b border-line py-4">
                  <dt className="text-muted">Availability</dt>
                  <dd>
                    <StockStatus stock={featured.stock} />
                  </dd>
                </div>
              </dl>

              <Link
                href={`/products/${featured.slug}`}
                className="btn btn-solid mt-10 self-start"
              >
                Discover the Piece
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <div className="mx-auto max-w-[1600px] px-4 py-20 text-center md:px-8">
          <p className="font-serif text-3xl">Nothing new just yet</p>
          <p className="mt-3 text-sm text-muted">
            New pieces will appear here as soon as they arrive.
          </p>
          <Link href="/shop/all" className="btn btn-solid mt-8">
            Shop All
          </Link>
        </div>
      )}

      {latest.length > 0 && (
        <section className="mx-auto max-w-[1600px] px-4 py-16 md:px-8 md:py-24">
          <SectionHeading
            eyebrow="Recently Added"
            title="More New Arrivals"
            link={{ label: "Shop All", href: "/shop/all" }}
          />
          <ProductGrid products={latest} />
        </section>
      )}
    </>
  );
}
