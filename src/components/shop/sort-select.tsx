"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SORT_OPTIONS, type SortOption } from "@/lib/listings";

export function SortSelect({ value }: { value: SortOption }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="flex items-center gap-3">
      <span className="label text-muted">Sort</span>
      <select
        value={value}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams);
          if (event.target.value === "newest") params.delete("sort");
          else params.set("sort", event.target.value);
          // A new order starts again from the first page.
          params.delete("page");
          const query = params.toString();
          router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
        }}
        className="h-10 border border-line bg-paper px-3 text-sm"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
