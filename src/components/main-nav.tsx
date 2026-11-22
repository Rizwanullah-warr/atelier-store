"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/lib/listings";

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="hidden border-t border-line md:block">
      <ul className="flex h-11 items-center justify-center gap-10">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`label border-b py-1 transition-colors hover:border-ink ${
                  active ? "border-ink" : "border-transparent"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
