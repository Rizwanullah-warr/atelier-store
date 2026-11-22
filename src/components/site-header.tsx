import Link from "next/link";

import { CartButton } from "@/components/cart/cart-button";
import { SearchIcon, UserIcon } from "@/components/icons";
import { MainNav } from "@/components/main-nav";
import { MobileMenu } from "@/components/mobile-menu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <p className="label bg-ink py-2 text-center text-[0.625rem] text-paper">
        Complimentary express shipping and returns
      </p>

      <div className="mx-auto grid h-16 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center px-4 md:h-20 md:px-8">
        <div className="flex items-center gap-4">
          <MobileMenu />
          <Link href="/search" aria-label="Search" className="hidden md:block">
            <SearchIcon />
          </Link>
        </div>

        <Link
          href="/"
          className="font-serif text-2xl tracking-[0.3em] md:text-4xl"
        >
          ATELIER
        </Link>

        <div className="flex items-center justify-end gap-4 md:gap-5">
          <Link href="/search" aria-label="Search" className="md:hidden">
            <SearchIcon />
          </Link>
          <Link href="/account" aria-label="Account" className="hidden sm:block">
            <UserIcon />
          </Link>
          <CartButton />
        </div>
      </div>

      <MainNav />
    </header>
  );
}
