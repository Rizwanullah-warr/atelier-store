# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

Next.js + TypeScript + Tailwind + Better Auth + Drizzle ORM + Neon Postgres. Products, categories and stock come from Postgres; editorial homepage content (hero, collections, editorials, services) stays in `src/lib/sample-data.ts`. There are no `#` placeholder links; keep it that way.

Routes: `/`, `/shop/[slug]` (curated listings in `src/lib/listings.ts` plus any category slug; `?category=&sort=&page=`), `/products/[slug]`, `/search?q=`, `/account` (Better Auth email + password), `/info/[slug]` (footer pages from `src/lib/info-pages.ts`; `draft` pages need real business/legal text before launch).

Not built: checkout, orders, payments, variants (stock is per product; `sizes` is just a selectable list), email verification / password reset (no email service), deployment, test runner. The shopping bag is client-only (`localStorage`, `src/components/cart/cart-context.tsx`) and its checkout button is intentionally disabled.

## Commands

- `npm run dev` / `npm run build` / `npm start`
- `npm run lint` (ESLint), `npm run typecheck` (`tsc --noEmit`)
- `npm run db:generate | db:migrate | db:studio` (drizzle-kit, reads `.env.local`). Schema changes use versioned migrations: generate, review the SQL in `drizzle/`, migrate. Avoid `db:push` against shared databases.
- `npm run db:seed` upserts the sample catalog from `src/db/seed/catalog-data.ts` (idempotent, by slug).
- Better Auth tables are hand-written in `src/db/schema/auth.ts` to match `getAuthTables()` from `@better-auth/core/db`; Better Auth validates them at startup. If you enable a plugin that adds fields, update that file and generate a migration.
- After adding a route, run `npx next typegen` (or `dev`/`build`) so `PageProps<"/route">` types exist before `typecheck`.

Setup: copy `.env.example` to `.env.local` (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`), then `db:migrate` and `db:seed`. `npm run build` needs a reachable `DATABASE_URL`, because product pages are prerendered from the database.

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

- `src/db/schema/catalog.ts`: `categories` 1→many `products` (FK `ON DELETE RESTRICT`). Prices are integer cents (`price_cents`); stock is a column on `products` (no variants); `images[0]` is the card/main image.
- `src/db/queries/products.ts`: the only place pages read products (`server-only`). Every function uses `"use cache"` + `cacheLife("hours")` + `cacheTag("products")`, which Cache Components requires for database reads during prerender. Arguments must be serializable. After changing catalog data, call `revalidateTag("products")`. Queries return the `StorefrontProduct` view type. Cached results persist in `.next/cache` across builds, so a rebuild alone won't pick up direct DB edits within the cache lifetime; delete `.next/cache` first.
- `src/lib/product-utils.ts`: `StorefrontProduct`, `formatPrice(cents)`, `getStockState` (0 sold out, ≤3 low). Client-safe; no DB imports.
- Unknown product slugs call `notFound()` after the static shell streams, so they render the not-found UI with `noindex` but an HTTP 200 (documented Cache Components behavior; `dynamicParams` is unavailable).

Path alias: `@/*` maps to `src/*`. App Router with `src/` directory.

## Design system

- Tokens live in `src/app/globals.css` and are exposed to Tailwind via `@theme`: colors `paper`, `surface`, `ink`, `muted`, `line`, `accent`; fonts `font-sans` (Geist) and `font-serif` (Cormorant Garamond, for headings and the wordmark). Use these instead of raw Tailwind palette colors.
- Shared classes in the same file: `.label` (small uppercase tracked text), `.btn` with `.btn-solid` / `.btn-light`, `.link-underline`.
- Light theme only. Square corners, 1px `line` borders, no shadows; photography carries the color.
- Header and footer are rendered once in `src/app/layout.tsx`. The header uses `backdrop-blur`, which traps `position: fixed` children, so overlays opened from it must be portaled to `document.body` (see `mobile-menu.tsx`).
- Remote images must be allowed in `images.remotePatterns` in `next.config.ts` (currently only `images.unsplash.com`). Use `preload` (not the deprecated `priority`) for the above-the-fold image.
