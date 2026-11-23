"use client";

import { HeartIcon } from "@/components/icons";
import { useWishlist } from "@/components/wishlist/wishlist-context";

// "card": small button over a product image. "page": square button beside Add to Bag.
export function WishlistButton({
  slug,
  name,
  variant = "card",
}: {
  slug: string;
  name: string;
  variant?: "card" | "page";
}) {
  const { has, toggle } = useWishlist();
  const saved = has(slug);
  const label = saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`;

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={label}
      title={saved ? "Saved to wishlist" : "Save to wishlist"}
      onClick={() => void toggle(slug)}
      className={
        variant === "card"
          ? "absolute right-3 top-3 grid size-9 place-items-center bg-paper text-ink transition-colors hover:bg-ink hover:text-paper"
          : "grid size-12 shrink-0 place-items-center border border-line transition-colors hover:border-ink"
      }
    >
      <HeartIcon filled={saved} width={18} height={18} />
    </button>
  );
}
