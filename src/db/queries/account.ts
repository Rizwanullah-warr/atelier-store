import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  addresses,
  bagItems,
  products,
  productVariants,
  wishlistItems,
} from "@/db/schema";

// Everything here is per customer and never cached.

// ---- Bag ------------------------------------------------------------------

export type BagLine = {
  sku: string;
  slug: string;
  name: string;
  image: string;
  priceCents: number;
  color: string;
  size: string | null;
  quantity: number;
  maxQuantity: number;
};

const lineColumns = {
  sku: productVariants.sku,
  slug: products.slug,
  name: products.name,
  image: sql<string>`coalesce(${products.images}[1], '')`,
  priceCents: products.priceCents,
  color: productVariants.color,
  size: productVariants.size,
  maxQuantity: productVariants.stock,
};

export async function getSavedBag(userId: string): Promise<BagLine[]> {
  return db
    .select({ ...lineColumns, quantity: bagItems.quantity })
    .from(bagItems)
    .innerJoin(productVariants, eq(bagItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(bagItems.userId, userId))
    .orderBy(asc(bagItems.createdAt), asc(productVariants.sku));
}

// Replaces the saved bag with these lines. Unknown SKUs are ignored.
export async function replaceSavedBag(
  userId: string,
  lines: { sku: string; quantity: number }[],
) {
  const variants = lines.length
    ? await db
        .select({ id: productVariants.id, sku: productVariants.sku })
        .from(productVariants)
        .where(inArray(productVariants.sku, lines.map((line) => line.sku)))
    : [];
  const idBySku = new Map(variants.map((variant) => [variant.sku, variant.id]));
  const rows = lines.flatMap((line) => {
    const variantId = idBySku.get(line.sku);
    return variantId ? [{ userId, variantId, quantity: line.quantity }] : [];
  });

  // One round trip, applied atomically.
  const clear = db.delete(bagItems).where(eq(bagItems.userId, userId));
  if (rows.length) await db.batch([clear, db.insert(bagItems).values(rows)]);
  else await clear;
}

// Combines a guest bag with the saved one: same SKU adds up, capped at stock.
export async function mergeIntoSavedBag(
  userId: string,
  local: { sku: string; quantity: number }[],
): Promise<BagLine[]> {
  const saved = await getSavedBag(userId);
  const wanted = new Map<string, number>();
  for (const line of saved) wanted.set(line.sku, line.quantity);
  for (const line of local)
    wanted.set(line.sku, (wanted.get(line.sku) ?? 0) + line.quantity);

  const skus = [...wanted.keys()];
  if (skus.length === 0) return [];
  const live = await db
    .select(lineColumns)
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(inArray(productVariants.sku, skus));
  const savedQuantity = new Map(saved.map((line) => [line.sku, line.quantity]));

  const merged: BagLine[] = live.flatMap((line) => {
    const total = wanted.get(line.sku) ?? 0;
    // In stock: cap at stock. Sold out: keep it only if it was already saved,
    // so the customer still sees it flagged as unavailable.
    const quantity =
      line.maxQuantity > 0
        ? Math.min(total, line.maxQuantity)
        : (savedQuantity.get(line.sku) ?? 0);
    return quantity > 0 ? [{ ...line, quantity }] : [];
  });
  // Keep the saved order first, then new lines.
  const order = new Map(skus.map((sku, index) => [sku, index]));
  merged.sort((a, b) => order.get(a.sku)! - order.get(b.sku)!);

  await replaceSavedBag(
    userId,
    merged.map(({ sku, quantity }) => ({ sku, quantity })),
  );
  return merged;
}

// ---- Wishlist -------------------------------------------------------------

export async function getWishlistSlugs(userId: string): Promise<string[]> {
  const rows = await db
    .select({ slug: products.slug })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .where(eq(wishlistItems.userId, userId))
    .orderBy(desc(wishlistItems.createdAt));
  return rows.map((row) => row.slug);
}

export async function addWishlistSlugs(userId: string, slugs: string[]) {
  if (slugs.length === 0) return;
  const found = await db
    .select({ id: products.id })
    .from(products)
    .where(inArray(products.slug, slugs));
  if (found.length === 0) return;
  await db
    .insert(wishlistItems)
    .values(found.map((product) => ({ userId, productId: product.id })))
    .onConflictDoNothing();
}

export async function removeWishlistSlug(userId: string, slug: string) {
  const product = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  if (!product[0]) return;
  await db
    .delete(wishlistItems)
    .where(
      and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, product[0].id)),
    );
}

// ---- Addresses ------------------------------------------------------------

export type SavedAddress = typeof addresses.$inferSelect;
export type AddressInput = Omit<
  typeof addresses.$inferInsert,
  "id" | "userId" | "createdAt" | "updatedAt"
>;

export async function listAddresses(userId: string): Promise<SavedAddress[]> {
  return db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), asc(addresses.createdAt));
}

// The first address becomes the default; choosing a new default clears the old
// one in the same batch so the one-default-per-user index holds.
export async function saveAddress(
  userId: string,
  input: AddressInput,
  id?: string,
): Promise<boolean> {
  const existing = await db
    .select({ id: addresses.id })
    .from(addresses)
    .where(eq(addresses.userId, userId));
  if (id && !existing.some((row) => row.id === id)) return false;

  const makeDefault = input.isDefault || (!id && existing.length === 0);
  const values = { ...input, isDefault: makeDefault };
  const clearDefault = db
    .update(addresses)
    .set({ isDefault: false })
    .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)));
  const write = id
    ? db
        .update(addresses)
        .set(values)
        .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    : db.insert(addresses).values({ ...values, userId });

  if (makeDefault) await db.batch([clearDefault, write]);
  else await write;
  return true;
}

export async function setDefaultAddress(userId: string, id: string) {
  const clearDefault = db
    .update(addresses)
    .set({ isDefault: false })
    .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)));
  const set = db
    .update(addresses)
    .set({ isDefault: true })
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  await db.batch([clearDefault, set]);
}

export async function deleteAddress(userId: string, id: string) {
  await db
    .delete(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  // Promote the oldest remaining address if the default was removed.
  const rest = await listAddresses(userId);
  if (rest.length > 0 && !rest.some((row) => row.isDefault))
    await setDefaultAddress(userId, rest[0].id);
}
