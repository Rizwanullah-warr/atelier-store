import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SearchIcon } from "@/components/icons";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/product/product-grid";
import { searchProducts } from "@/db/queries/products";
import { navItems } from "@/lib/listings";

export const metadata: Metadata = {
  title: "Search | Atelier Store",
};

const firstValue = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-20 md:px-8">
      <header className="mx-auto max-w-2xl py-12 text-center md:py-20">
        <p className="label text-muted">Search</p>
        <h1 className="mt-3 font-serif text-5xl md:text-6xl">Find a Piece</h1>
        <Suspense fallback={<SearchForm defaultValue="" />}>
          <SearchFormWithQuery searchParams={props.searchParams} />
        </Suspense>
      </header>

      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <SearchResults searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function SearchForm({ defaultValue }: { defaultValue: string }) {
  return (
    <form action="/search" role="search" className="mt-8 flex border-b border-ink">
      <label htmlFor="search-query" className="sr-only">
        Search products
      </label>
      <input
        id="search-query"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search coats, bags, jewelry…"
        autoFocus
        autoComplete="off"
        className="h-14 flex-1 bg-transparent text-lg outline-none placeholder:text-muted"
      />
      <button type="submit" aria-label="Search" className="px-2">
        <SearchIcon />
      </button>
    </form>
  );
}

async function SearchFormWithQuery({
  searchParams,
}: {
  searchParams: PageProps<"/search">["searchParams"];
}) {
  const query = firstValue((await searchParams).q);
  // key resets the uncontrolled input when the query changes.
  return <SearchForm key={query} defaultValue={query} />;
}

async function SearchResults({
  searchParams,
}: {
  searchParams: PageProps<"/search">["searchParams"];
}) {
  const query = firstValue((await searchParams).q).trim();

  if (!query) {
    return (
      <div className="text-center">
        <p className="label text-muted">Popular</p>
        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="label inline-flex h-9 items-center border border-line px-4 hover:border-ink"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const results = await searchProducts(query);

  return (
    <section aria-live="polite">
      <p className="mb-8 border-b border-line pb-4 text-sm text-muted">
        {results.length} {results.length === 1 ? "result" : "results"} for “{query}”
      </p>
      {results.length > 0 ? (
        <ProductGrid products={results} />
      ) : (
        <div className="py-16 text-center">
          <p className="font-serif text-3xl">No pieces found</p>
          <p className="mt-3 text-sm text-muted">
            Try a different word, such as a colour, material or category.
          </p>
          <Link href="/shop/all" className="btn btn-solid mt-8">
            Shop All
          </Link>
        </div>
      )}
    </section>
  );
}
