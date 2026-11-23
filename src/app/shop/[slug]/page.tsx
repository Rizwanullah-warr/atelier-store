import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/product/product-grid";
import { SortSelect } from "@/components/shop/sort-select";
import {
  getCategories,
  getListing,
  getListingProducts,
} from "@/db/queries/products";
import {
  curatedListings,
  PAGE_SIZE,
  parseSort,
  type Listing,
  type SortOption,
} from "@/lib/listings";

export async function generateStaticParams() {
  const categories = await getCategories();
  return [
    ...curatedListings.map((listing) => ({ slug: listing.slug })),
    ...categories.map((category) => ({ slug: category.slug })),
  ];
}

export async function generateMetadata(
  props: PageProps<"/shop/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const listing = await getListing(slug);
  if (!listing) return {};
  return {
    title: `${listing.title} | Atelier Store`,
    description: listing.description,
  };
}

// `params` is URL data, so it is read inside <Suspense>. Known slugs are
// prerendered (generateStaticParams); the fallback only covers client
// navigations to a listing that has not been prefetched yet.
export default function ShopPage(props: PageProps<"/shop/[slug]">) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <ListingContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

function ListingSkeleton() {
  return (
    <div
      aria-hidden
      className="mx-auto max-w-[1600px] animate-pulse px-4 md:px-8"
    >
      <div className="py-5">
        <div className="h-3 w-32 bg-surface" />
      </div>
      <div className="pb-10 pt-4 md:pb-14">
        <div className="h-3 w-20 bg-surface" />
        <div className="mt-4 h-12 w-64 bg-surface md:h-16" />
        <div className="mt-5 h-4 w-80 max-w-full bg-surface" />
      </div>
      <div className="h-[4.5rem] border-y border-line" />
      <div className="py-10 md:py-14">
        <ProductGridSkeleton />
      </div>
    </div>
  );
}

async function ListingContent({
  params,
  searchParams,
}: {
  params: PageProps<"/shop/[slug]">["params"];
  searchParams: PageProps<"/shop/[slug]">["searchParams"];
}) {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) notFound();

  return (
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
            {listing.title}
          </li>
        </ol>
      </nav>

      <header className="pb-10 pt-4 md:pb-14">
        <p className="label text-muted">{listing.eyebrow}</p>
        <h1 className="mt-3 font-serif text-5xl md:text-7xl">{listing.title}</h1>
        <p className="mt-4 max-w-xl text-sm text-muted md:text-base">
          {listing.description}
        </p>
      </header>

      {/* Filters, sort and page come from the URL, which is request-time data. */}
      <Suspense fallback={<ProductGridSkeleton />}>
        <ListingResults listing={listing} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

async function ListingResults({
  listing,
  searchParams,
}: {
  listing: Listing;
  searchParams: PageProps<"/shop/[slug]">["searchParams"];
}) {
  const params = await searchParams;
  const sort = parseSort(firstValue(params.sort));
  const requestedPage = Number.parseInt(firstValue(params.page) ?? "1", 10);

  const { products, total, page, pageCount, facets, category } =
    await getListingProducts(listing.filter, {
      category: firstValue(params.category),
      sort,
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
      pageSize: PAGE_SIZE,
    });
  const hrefFor = (next: { category?: string; sort?: SortOption; page?: number }) => {
    const query = new URLSearchParams();
    if (next.category) query.set("category", next.category);
    if (next.sort && next.sort !== "newest") query.set("sort", next.sort);
    if (next.page && next.page > 1) query.set("page", String(next.page));
    const search = query.toString();
    return `/shop/${listing.slug}${search ? `?${search}` : ""}`;
  };

  const showFacets = facets.length > 1;

  return (
    <>
      <div className="flex flex-col gap-5 border-y border-line py-4 md:flex-row md:items-center md:justify-between">
        {showFacets ? (
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
            <li>
              <FilterChip href={hrefFor({ sort })} active={!category}>
                All ({facets.reduce((sum, facet) => sum + facet.count, 0)})
              </FilterChip>
            </li>
            {facets.map((facet) => (
              <li key={facet.slug}>
                <FilterChip
                  href={hrefFor({ category: facet.slug, sort })}
                  active={category === facet.slug}
                >
                  {facet.name} ({facet.count})
                </FilterChip>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            {total} {total === 1 ? "piece" : "pieces"}
          </p>
        )}
        <SortSelect value={sort} />
      </div>

      <div className="py-10 md:py-14">
        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <div className="py-20 text-center">
            <p className="font-serif text-3xl">Nothing here yet</p>
            <p className="mt-3 text-sm text-muted">
              There are no pieces in this selection right now.
            </p>
            <Link href="/shop/all" className="btn btn-solid mt-8">
              Shop All
            </Link>
          </div>
        )}
      </div>

      {pageCount > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-center gap-2 border-t border-line pb-20 pt-10"
        >
          {page > 1 && (
            <Link
              href={hrefFor({ category, sort, page: page - 1 })}
              className="label px-3 py-2 hover:underline"
            >
              Previous
            </Link>
          )}
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
            <Link
              key={number}
              href={hrefFor({ category, sort, page: number })}
              aria-current={number === page ? "page" : undefined}
              className={`grid size-10 place-items-center text-sm ${
                number === page ? "bg-ink text-paper" : "hover:bg-surface"
              }`}
            >
              {number}
            </Link>
          ))}
          {page < pageCount && (
            <Link
              href={hrefFor({ category, sort, page: page + 1 })}
              className="label px-3 py-2 hover:underline"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`label inline-flex h-9 items-center whitespace-nowrap border px-4 ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-line hover:border-ink"
      }`}
    >
      {children}
    </Link>
  );
}
