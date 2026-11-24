"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { SearchIcon } from "@/components/icons";
import { formatPrice } from "@/lib/product-utils";

type Suggestion = {
  slug: string;
  name: string;
  category: string;
  priceCents: number;
  image: string | null;
};

// The search form with suggestions as you type (from /api/search/suggest).
// Without JavaScript it is still a normal GET form to /search.
export function SearchBox({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions shortly after typing stops; cancel stale requests.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as { suggestions: Suggestion[] };
        setSuggestions(data.suggestions);
        setActive(-1);
      } catch {
        // Aborted or offline: keep the previous suggestions.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close when clicking outside.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const term = query.trim();
  const visible = open && term.length >= 2;
  const items = term.length >= 2 ? suggestions : [];

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!visible) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, -1));
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Enter" && active >= 0 && items[active]) {
      event.preventDefault();
      setOpen(false);
      router.push(`/products/${items[active].slug}`);
    }
  };

  return (
    <div ref={wrapperRef} className="relative mt-8 text-left">
      <form action="/search" role="search" className="flex border-b border-ink">
        <label htmlFor="search-query" className="sr-only">
          Search products
        </label>
        <input
          id="search-query"
          name="q"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search coats, bags, jewelry…"
          autoFocus
          autoComplete="off"
          role="combobox"
          aria-expanded={visible}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className="h-14 flex-1 bg-transparent text-lg outline-none placeholder:text-muted"
        />
        <button type="submit" aria-label="Search" className="px-2">
          <SearchIcon />
        </button>
      </form>

      {visible && (
        <div className="absolute inset-x-0 top-full z-30 border border-t-0 border-line bg-paper">
          <ul id={listId} role="listbox" aria-label="Suggestions">
            {items.map((item, index) => (
              <li
                key={item.slug}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
              >
                <a
                  href={`/products/${item.slug}`}
                  onClick={(event) => {
                    event.preventDefault();
                    setOpen(false);
                    router.push(`/products/${item.slug}`);
                  }}
                  onMouseEnter={() => setActive(index)}
                  className={`flex items-center gap-4 px-4 py-3 ${index === active ? "bg-surface" : ""}`}
                >
                  <span className="relative aspect-[3/4] w-10 shrink-0 bg-surface">
                    {item.image && (
                      <Image src={item.image} alt="" fill sizes="40px" className="object-cover" />
                    )}
                  </span>
                  <span className="flex-1 text-sm">
                    {item.name}
                    <span className="label block text-muted">{item.category}</span>
                  </span>
                  <span className="text-sm text-muted">{formatPrice(item.priceCents)}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-4 py-3 text-sm text-muted" aria-live="polite">
            {loading && items.length === 0
              ? "Searching…"
              : items.length === 0
                ? `No suggestions for “${term}”. Press Enter to search.`
                : `Press Enter to see all results for “${term}”.`}
          </p>
        </div>
      )}
    </div>
  );
}
