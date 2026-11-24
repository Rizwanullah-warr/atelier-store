# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

Next.js + TypeScript + Tailwind + Better Auth + Drizzle ORM + Neon Postgres. Products, categories and stock come from Postgres; editorial homepage content (hero, collections, editorials, services) stays in `src/lib/sample-data.ts`. There are no `#` placeholder links; keep it that way.

Routes: `/`, `/new-arrivals` (newest products by `created_at`; the "New In" nav and "Shop New In" buttons link here), `/shop/[slug]` (curated listings in `src/lib/listings.ts` plus any category slug; `?category=&sort=&page=`), `/products/[slug]`, `/search?q=`, `/account` (Better Auth email + password; orders, saved addresses, verify-email banner), `/account/reset-password?token=`, `/wishlist`, `/account/orders/[number]` (owner only), `/checkout/success?session_id=` and `/checkout/cancelled` (Stripe return pages), `/info/[slug]` (footer pages from `src/lib/info-pages.ts`; `draft` pages need real business/legal text before launch).

Not built: order confirmation emails, shipment tracking numbers, image uploads, deployment, test runner. The shopping bag lives in `localStorage` (`src/components/cart/cart-context.tsx`, key `atelier-bag-v2`, one line per variant SKU). Opening the bag calls `validate()`, a read-only server action (`src/lib/bag-actions.ts`) that reads live stock and price from the database and corrects the bag. Checkout is Stripe Checkout (hosted page); see "Checkout and orders" below. Without `STRIPE_SECRET_KEY` the checkout button says payments are not set up.

## Commands

- `npm run dev` / `npm run build` / `npm start`
- `npm run lint` (ESLint), `npm run typecheck` (`tsc --noEmit`)
- `npm run db:generate | db:migrate | db:studio` (drizzle-kit, reads `.env.local`). Schema changes use versioned migrations: generate, review the SQL in `drizzle/`, migrate. Avoid `db:push` against shared databases.
- `npm run db:seed` upserts the sample catalog from `src/db/seed/catalog-data.ts` (idempotent: products by slug, variants by SKU; variants dropped from the seed data are deleted). It resets stock to the seeded values. In the seed data, `colors[0]` is the photographed colour and `stock` is a number (one size) or one number per size.
- Better Auth tables are hand-written in `src/db/schema/auth.ts` to match `getAuthTables()` from `@better-auth/core/db`; Better Auth validates them at startup. If you enable a plugin that adds fields, update that file and generate a migration.
- After adding a route, run `npx next typegen` (or `dev`/`build`) so `PageProps<"/route">` types exist before `typecheck`.

Setup: copy `.env.example` to `.env.local` (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, optional `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`), then `db:migrate` and `db:seed`. The root layout reads `STRIPE_SECRET_KEY` to decide whether checkout is enabled, and it is prerendered, so restart `dev` or rebuild after changing it. `npm run build` needs a reachable `DATABASE_URL`, because product pages are prerendered from the database.

## Next.js version caveat

This is Next 16 / React 19 with breaking changes from older versions. [AGENTS.md](AGENTS.md) says to read the relevant guide in `node_modules/next/dist/docs/` before writing Next code (e.g. `proxy.md` replaces `middleware.md`). `next.config.ts` enables `cacheComponents` and `partialPrefetching`, which change how dynamic data access and caching must be written. Tailwind 4 runs through a Turbopack loader rule in `next.config.ts` (no `tailwind.config`).

## Architecture

Database and auth are linked across several files:

- `src/db/index.ts`: Drizzle client using `drizzle-orm/neon-http` over `@neondatabase/serverless`; imports `* as schema` from `src/db/schema`. Throws at import if `DATABASE_URL` is unset. The neon-http driver does not support interactive transactions.
- `src/db/schema/index.ts`: single barrel for all tables. `drizzle.config.ts` points at the `./src/db/schema` directory, so every table must be reachable from here. Migrations output to `./drizzle`.
- `src/lib/auth.ts`: server-side `betterAuth` using `drizzleAdapter(db, { provider: "pg", schema })`. The adapter needs the Better Auth tables to exist in the schema barrel. `nextCookies()` must remain the last plugin.
- `src/lib/auth-client.ts`: browser client (`better-auth/react`), base URL from `NEXT_PUBLIC_APP_URL`.
- `src/app/api/auth/[...all]/route.ts`: mounts the Better Auth handler via `toNextJsHandler`.

Catalog data flow:

- `src/db/schema/catalog.ts`: `categories` 1→many `products` (FK `ON DELETE RESTRICT`) 1→many `product_variants` (FK `ON DELETE CASCADE`). Prices are integer cents on `products` (`price_cents`). Stock lives only on `product_variants` (one row per colour × size; `size` null = one size; unique `(product_id, color, size)` with `NULLS NOT DISTINCT`). `products.color` is the colour the product is photographed in. `images[0]` is the card/main image.
- SKUs are `skuFor(slug, color, size)` in `src/lib/product-utils.ts` (e.g. `biker-leather-jacket-black-m`). The same format is hard-coded in the data step of `drizzle/0002_product_variants.sql`, and the seed upserts variants by SKU, so keep them in sync.
- `src/db/queries/products.ts`: the only place pages read products (`server-only`). `StorefrontProduct.stock` is the sum of variant stock (a subquery); `getProductBySlug` returns `ProductDetail` with `variants`. `getLiveBagLines` is the one deliberately uncached read (live stock for the bag). Every other function uses `"use cache"` + `cacheLife("hours")` + `cacheTag("products")`, which Cache Components requires for database reads during prerender. Arguments must be serializable. After changing catalog data, call `revalidateTag("products")`. Queries return the `StorefrontProduct` view type. Cached results persist in `.next/cache` across builds, so a rebuild alone won't pick up direct DB edits within the cache lifetime; delete `.next/cache` first.
- `src/lib/product-utils.ts`: `StorefrontProduct`, `ProductVariant`, `ProductDetail`, `skuFor`, `formatPrice(cents)`, `getStockState` (0 sold out, ≤3 low). Client-safe; no DB imports.
- Dynamic pages (`/shop/[slug]`, `/products/[slug]`, `/info/[slug]`) must read `params`/`searchParams` inside `<Suspense>`: the default export renders a skeleton fallback and passes the promise to an async `*Content` child. Awaiting `params` in the page itself triggers the dev "URL data during prerendering" warning.
- Unknown product slugs call `notFound()` after the static shell streams, so they render the not-found UI with `noindex` but an HTTP 200 (documented Cache Components behavior; `dynamicParams` is unavailable).

Checkout and orders:

- `src/db/schema/orders.ts`: `orders` (status `pending | paid | refunded | expired | failed`, identity `number` shown as `AT-1001`, nullable `user_id` for guests, Stripe ids, shipping snapshot) 1→many `order_items` (snapshot of name/colour/size/price per SKU; unique `(order_id, sku)`; `variant_id` set null if the variant is deleted).
- `src/lib/checkout-actions.ts` `startCheckout` (server action): validates SKUs/quantities, reads prices and stock live from the database (`getCheckoutVariants`; client prices are never used), creates a `pending` order, creates a Stripe Checkout session (idempotency key per order) and `redirect()`s to Stripe. Stock is **not** reserved at this point.
- `src/lib/checkout.ts` `syncCheckoutSession(id)`: re-fetches the session from Stripe and, if paid, calls `markOrderPaid` (`src/db/queries/orders.ts`), one SQL statement that claims the pending order and decrements every variant. The `stock >= 0` check makes it all-or-nothing; on a shortage the payment is refunded (idempotency key `refund-<orderId>`) and the order becomes `refunded`. Safe to call repeatedly and concurrently.
- It is called from `src/app/api/stripe/webhook/route.ts` (signature-verified; events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`) and from `src/app/api/checkout/complete/route.ts`, the Checkout `success_url`, which confirms and then redirects to `/checkout/success`. Both call `revalidateTag("products", { expire: 0 })` after a sale; pages cannot (revalidation is not allowed during render).
- Order reads are per customer and never cached. The confirmation page finds the order by Stripe session id; account pages filter by `user_id` and only show `paid`/`refunded` orders.

Admin (`/admin`):

- Access: `user.role` (`customer` | `admin`), declared as a Better Auth additional field with `input: false`. Grant with `npm run user:role -- <email> admin` (`src/db/set-role.ts`). `src/lib/admin.ts` (`getAdminAccess`, `isAdmin`) reads the session once per request.
- Every admin page checks access inside its own `<Suspense>` and renders `AdminDenied` for others; `src/app/admin/layout.tsx` only adds the admin header for admins and always renders the page (hiding the page breaks instant-navigation validation). Every action in `src/lib/admin-actions.ts` re-checks `isAdmin()` itself, because Server Actions are reachable by direct POST.
- Actions validate with zod, write through `src/db/queries/admin.ts` (server-only, uncached), then call `updateTag("products")` (catalog) and `refresh()`. Forms use `useAdminForm` (`src/components/admin/form-kit.tsx`), which submits via `onSubmit` so React 19 does not reset fields on validation errors.
- Images are `https://images.unsplash.com` links only (the only `images.remotePatterns` host; no upload storage). Variant SKUs are fixed at creation. Category slugs can't reuse curated listing slugs. Orders have a separate `fulfillment_status` (`unfulfilled | shipped | delivered`) that admins set on paid orders; customers see it as "Confirmed · Shipped".

Accounts (wishlist, bag sync, addresses, email):

- `src/db/schema/account.ts`: `wishlist_items` (user, product), `bag_items` (user, variant, quantity), `addresses` (one default per user via a partial unique index). Access goes through `src/db/queries/account.ts`; client-callable server actions are in `src/lib/account-actions.ts` (input validated with zod, user taken from the session, never from the client).
- Wishlist: `WishlistProvider` (root layout) keeps slugs in state. Guests use `localStorage` (`atelier-wishlist-v1`); on sign-in they are merged into the database and the local copy is cleared. Hearts: `WishlistButton` on `ProductCard` and next to Add to Bag.
- Bag sync: `CartProvider` stays localStorage-first. On sign-in it merges a **guest** bag into `bag_items` (adds quantities, caps at stock); the bag is then mirrored to the database (debounced `saveBag`). `atelier-bag-owner` in localStorage marks a bag that already mirrors an account, so reloads load from the database instead of merging again (merging a mirror doubles quantities). `detach()` runs on sign-out.
- Email: `src/lib/email.ts` sends through Resend's HTTP API (`RESEND_API_KEY`, optional `EMAIL_FROM`). Without a key the reset and verification actions answer `not-configured` and the UI says no email was sent; Better Auth's reset/verification hooks are only enabled when the key exists (read at startup, so restart dev). Sign-in does not require a verified email. Reset requests give the same answer whether or not the address has an account; send failures are only in the server log. Resend only delivers to your own address until you verify a domain.
- Checkout still collects the shipping address on Stripe; saved addresses are not used there yet.

Discovery and reviews:

- Shop filters live in the URL (`?size=&color=&stock=1&min=&max=`, dollars), parsed and validated by `parseRefine` in `src/lib/listings.ts` and applied in `getListingProducts` (a product matches if any variant fits size/colour/stock). The panel (`src/components/shop/listing-filters.tsx`) is a `next/form` GET form, so it works without JavaScript. Category, sort and pagination links keep the filters (`appendRefine`).
- Search suggestions: `src/components/search/search-box.tsx` (combobox) calls `GET /api/search/suggest?q=` (cached `searchProducts`).
- Recently viewed: slugs in `localStorage` (`atelier-recently-viewed`), cards loaded fresh through the `getProductCards` server action (`src/lib/product-actions.ts`). Shown on product pages and the homepage.
- Reviews: `reviews` table (one per customer per product). Public reads are cached with tag `reviews` (`src/db/queries/reviews.ts`); writing requires a paid order containing the product, re-checked inside `src/lib/review-actions.ts`.

Path alias: `@/*` maps to `src/*`. App Router with `src/` directory.

## Design system

- Tokens live in `src/app/globals.css` and are exposed to Tailwind via `@theme`: colors `paper`, `surface`, `ink`, `muted`, `line`, `accent`; fonts `font-sans` (Geist) and `font-serif` (Cormorant Garamond, for headings and the wordmark). Use these instead of raw Tailwind palette colors.
- Shared classes in the same file: `.label` (small uppercase tracked text), `.btn` with `.btn-solid` / `.btn-light`, `.link-underline`.
- Light theme only. Square corners, 1px `line` borders, no shadows; photography carries the color.
- Header and footer are rendered once in `src/app/layout.tsx`. The header uses `backdrop-blur`, which traps `position: fixed` children, so overlays opened from it must be portaled to `document.body` (see `mobile-menu.tsx`).
- Remote images must be allowed in `images.remotePatterns` in `next.config.ts` (currently only `images.unsplash.com`). Use `preload` (not the deprecated `priority`) for the above-the-fold image.
