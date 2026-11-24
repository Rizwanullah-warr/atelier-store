# Atelier Store

A premium fashion e-commerce store built with Next.js 16, TypeScript, Tailwind CSS 4, Drizzle ORM, Neon Postgres, Better Auth and Stripe.

**Live site:** https://atelier-store.vercel.app

## Features

- Homepage, New Arrivals, shop listings (Women, Men, categories, gifts), product pages, search
- Product variants: colour and size, each with its own stock
- Shop filters (size, colour, price, in stock) kept in the URL; instant search suggestions
- Shopping bag that re-checks live stock and prices
- Stripe Checkout (test mode until a live key is added), orders, automatic refund if stock runs out
- Accounts (email + password): order history, wishlist, address book, password reset (email via Resend)
- Product reviews from customers who bought the item; recently viewed products
- Admin area at `/admin`: products, prices, stock, colours, categories and order delivery status
- SEO: sitemap, robots.txt, social previews, product structured data; friendly error pages

## Run it on your computer

Requirements: [Node.js 22](https://nodejs.org) or newer.

```bash
git clone https://github.com/Rizwanullah-warr/atelier-store.git
cd atelier-store
npm install
```

Create a file called `.env.local` (copy `.env.example`) and fill in the values (see the table below). Then:

```bash
npm run db:migrate   # create the database tables (only needed for a new database)
npm run db:seed      # load the sample products (resets stock to the sample values)
npm run dev          # start the site at http://localhost:3000
```

## Settings (environment variables)

| Name | Required | What it is |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon Postgres connection string (Neon console -> Connect) |
| `BETTER_AUTH_SECRET` | Yes | Random secret for sign-in sessions (`npx @better-auth/cli secret`) |
| `BETTER_AUTH_URL` | Yes | The site address, e.g. `http://localhost:3000` or the live URL |
| `NEXT_PUBLIC_APP_URL` | Yes | Same address as `BETTER_AUTH_URL` |
| `STRIPE_SECRET_KEY` | No | Stripe secret key (`sk_test_...`). Without it, checkout says payments are not set up |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret (`whsec_...`) for `/api/stripe/webhook` |
| `RESEND_API_KEY`, `EMAIL_FROM` | No | Email for password reset and verification. Without it, the site says email isn't set up |

Never commit `.env.local` or any file with real values; git ignores `.env*` files except `.env.example`.

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Production build / run it |
| `npm run lint` / `npm run typecheck` | Check the code |
| `npm run db:generate` | Create a migration after changing `src/db/schema` |
| `npm run db:migrate` | Apply migrations to the database |
| `npm run db:seed` | Load the sample catalog |
| `npm run db:studio` | Browse the database in the browser |
| `npm run user:role -- you@example.com admin` | Make an account an admin (`customer` to undo) |

## Admin access

1. Create an account on the site (`/account`).
2. Run `npm run user:role -- your@email.com admin` on your computer (it uses the database in `.env.local`, the same one the live site uses).
3. Open **Account -> Store Admin**, or go to `/admin`.

## Deploying (Vercel)

The site is deployed on Vercel from the `main` branch: every push to GitHub redeploys it automatically.

- Project settings: Framework **Next.js**, Root Directory `./`.
- Environment variables: the four required ones above, with `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` set to the live address (no quote marks).
- `vercel.json` runs the site in Singapore (`sin1`), next to the Neon database.
- After changing an environment variable in Vercel, redeploy (Deployments -> ... -> Redeploy).

## Payments (Stripe)

1. Create a Stripe account and copy the **test** secret key (Developers -> API keys).
2. Add `STRIPE_SECRET_KEY` to `.env.local` and to Vercel, then restart / redeploy.
3. Test card: `4242 4242 4242 4242`, any future date, any CVC.
4. For webhooks in production: Stripe Dashboard -> Developers -> Webhooks -> add `https://<your site>/api/stripe/webhook` with the events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, and put its signing secret in `STRIPE_WEBHOOK_SECRET`.

## Project structure

- `src/app` - pages and API routes (App Router)
- `src/components` - UI components
- `src/db/schema` - database tables; `drizzle/` - migrations
- `src/db/queries` - all database reads and writes
- `src/lib` - auth, Stripe, checkout, admin and other server actions
- `CLAUDE.md` - detailed technical notes on how everything fits together

## Still to do

- Real payment test with a Stripe key; live Stripe keys for real sales
- Product image uploads (images are Unsplash links for now)
- Shipping tracking numbers and order emails
- Replace the draft info pages (shipping, returns, privacy, terms) with real business text
