import Form from "next/form";
import Link from "next/link";

import { refineCount, type RefineParams, type SortOption } from "@/lib/listings";

const boxClass =
  "h-10 w-full border border-line bg-paper px-3 text-sm outline-none focus:border-ink";

// A plain GET form: the chosen filters become URL parameters, so the page
// works without JavaScript and a filtered listing can be shared.
export function ListingFilters({
  action,
  category,
  sort,
  refine,
  sizes,
  colors,
  priceRange,
}: {
  action: string;
  category?: string;
  sort: SortOption;
  refine: RefineParams;
  sizes: string[];
  colors: { name: string; hex: string | null }[];
  priceRange: { min: number; max: number };
}) {
  const active = refineCount(refine);
  const clearQuery = new URLSearchParams();
  if (category) clearQuery.set("category", category);
  if (sort !== "newest") clearQuery.set("sort", sort);
  const clearHref = `${action}${clearQuery.size ? `?${clearQuery}` : ""}`;

  return (
    <details className="group border-b border-line" open={active > 0}>
      <summary className="label flex cursor-pointer list-none items-center justify-between py-4 [&::-webkit-details-marker]:hidden">
        <span>Filter{active > 0 && ` (${active})`}</span>
        <span className="text-base transition-transform group-open:rotate-45">+</span>
      </summary>

      <Form action={action} className="grid gap-8 pb-8 md:grid-cols-2 lg:grid-cols-4">
        {category && <input type="hidden" name="category" value={category} />}
        {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}

        {sizes.length > 0 && (
          <fieldset>
            <legend className="label mb-3 text-muted">Size</legend>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => (
                <label key={size} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="size"
                    value={size}
                    defaultChecked={refine.sizes.includes(size)}
                    className="peer sr-only"
                  />
                  <span className="inline-flex h-10 min-w-12 items-center justify-center border border-line px-3 text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline peer-focus-visible:outline-1">
                    {size}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {colors.length > 0 && (
          <fieldset>
            <legend className="label mb-3 text-muted">Colour</legend>
            <div className="flex flex-col gap-2">
              {colors.map((color) => (
                <label key={color.name} className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="color"
                    value={color.name}
                    defaultChecked={refine.colors.includes(color.name)}
                    className="size-4 accent-ink"
                  />
                  <span
                    aria-hidden
                    className="size-4 border border-line"
                    style={{ backgroundColor: color.hex ?? undefined }}
                  />
                  {color.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="label mb-3 text-muted">Price (USD)</legend>
          <div className="flex items-center gap-2">
            <input
              name="min"
              inputMode="numeric"
              aria-label="Minimum price"
              placeholder={String(Math.floor(priceRange.min / 100))}
              defaultValue={refine.minCents !== null ? refine.minCents / 100 : ""}
              className={boxClass}
            />
            <span className="text-muted">–</span>
            <input
              name="max"
              inputMode="numeric"
              aria-label="Maximum price"
              placeholder={String(Math.ceil(priceRange.max / 100))}
              defaultValue={refine.maxCents !== null ? refine.maxCents / 100 : ""}
              className={boxClass}
            />
          </div>
          <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="stock"
              value="1"
              defaultChecked={refine.inStock}
              className="size-4 accent-ink"
            />
            In stock only
          </label>
        </fieldset>

        <div className="flex flex-wrap items-end gap-4">
          <button type="submit" className="btn btn-solid">
            Apply
          </button>
          {active > 0 && (
            <Link href={clearHref} className="label link-underline">
              Clear Filters
            </Link>
          )}
        </div>
      </Form>
    </details>
  );
}
