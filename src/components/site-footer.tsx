import Link from "next/link";

import { infoHref, infoPages } from "@/lib/info-pages";

const groups = ["Client Services", "The House", "Legal"] as const;

export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-x-6 gap-y-12 px-4 py-16 md:grid-cols-[1.5fr_repeat(3,1fr)] md:px-8 md:py-20">
        <div className="col-span-2 max-w-sm md:col-span-1">
          <p className="font-serif text-3xl tracking-[0.3em]">ATELIER</p>
          <p className="mt-5 text-sm leading-relaxed text-paper/60">
            Considered clothing and accessories, made in small runs by the
            workshops we know by name.
          </p>
        </div>

        {groups.map((group) => (
          <div key={group}>
            <h2 className="label text-paper/50">{group}</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {infoPages
                .filter((page) => page.group === group)
                .map((page) => (
                  <li key={page.slug}>
                    <Link
                      href={infoHref(page.slug)}
                      className="text-paper/85 transition-colors hover:text-paper"
                    >
                      {page.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-paper/15">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-6 text-xs text-paper/50 sm:flex-row sm:justify-between md:px-8">
          <p>&copy; 2026 Atelier. All rights reserved.</p>
          <p>United States / English / USD</p>
        </div>
      </div>
    </footer>
  );
}
