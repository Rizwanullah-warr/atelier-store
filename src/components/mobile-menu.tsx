"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { CloseIcon, MenuIcon } from "@/components/icons";
import { infoHref } from "@/lib/info-pages";
import { navItems } from "@/lib/listings";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </button>

      {/* Portal to body: the header's backdrop-filter would otherwise trap this fixed overlay inside it. */}
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-50 flex flex-col bg-paper"
          >
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <span className="font-serif text-2xl tracking-[0.3em]">
                ATELIER
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-4">
              <ul>
                {navItems.map((item) => (
                  <li key={item.href} className="border-b border-line">
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block py-5 font-serif text-3xl"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex gap-6 border-t border-line px-4 py-5">
              <Link href="/account" onClick={() => setOpen(false)} className="label">
                Sign In
              </Link>
              <Link
                href={infoHref("contact")}
                onClick={() => setOpen(false)}
                className="label"
              >
                Client Services
              </Link>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
