// Loads the initial catalog. Safe to re-run: rows are upserted by slug.
// Run with `npm run db:seed`.

import { and, eq, getTableColumns, inArray, notInArray, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { categories, products, productVariants } from "@/db/schema";
import {
  categorySeeds,
  productSeeds,
  type ColorSeed,
  type ProductSeed,
} from "@/db/seed/catalog-data";
import { skuFor } from "@/lib/product-utils";

// On conflict, overwrite every listed column with the incoming value.
const excluded = <T extends PgTable>(table: T, columns: string[]) => {
  const all = getTableColumns(table);
  return Object.fromEntries(
    columns.map((key) => [key, sql.raw(`excluded."${all[key].name}"`)]),
  );
};

type VariantSpec = {
  color: ColorSeed;
  size: string | null;
  stock: number;
  sortOrder: number;
};

// One variant per colour x size (or per colour for one-size products).
const variantRows = ({ slug, sizes, colors }: ProductSeed) =>
  colors.flatMap((color, colorIndex): VariantSpec[] => {
    if (sizes.length === 0) {
      if (typeof color.stock !== "number") {
        throw new Error(`${slug}: one-size colour ${color.name} needs a single stock number`);
      }
      return [{ color, size: null, stock: color.stock, sortOrder: colorIndex * 100 }];
    }
    if (!Array.isArray(color.stock) || color.stock.length !== sizes.length) {
      throw new Error(`${slug}: ${color.name} needs one stock number per size`);
    }
    const stock = color.stock;
    return sizes.map((size, sizeIndex) => ({
      color,
      size,
      stock: stock[sizeIndex],
      sortOrder: colorIndex * 100 + sizeIndex,
    }));
  }).map(({ color, size, stock, sortOrder }) => ({
    productId: sql`(select ${products.id} from ${products} where ${eq(products.slug, slug)})`,
    sku: skuFor(slug, color.name, size),
    color: color.name,
    colorHex: color.hex,
    size,
    stock,
    sortOrder,
  }));

async function main() {
  const now = Date.now();

  const upsertCategories = db
    .insert(categories)
    .values(categorySeeds)
    .onConflictDoUpdate({
      target: categories.slug,
      set: excluded(categories, ["name", "sortOrder"]),
    });

  const upsertProducts = db
    .insert(products)
    .values(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- sizes belong to variants
      productSeeds.map(({ categorySlug, sizes, colors, ...product }, index) => ({
        ...product,
        // The first colour is the one photographed.
        color: colors[0]?.name ?? null,
        categoryId: sql`(select ${categories.id} from ${categories} where ${eq(categories.slug, categorySlug)})`,
        // Earlier entries are newer, so New Arrivals keeps the listed order.
        createdAt: new Date(now - index * 60_000),
      })),
    )
    .onConflictDoUpdate({
      target: products.slug,
      set: {
        ...excluded(products, [
          "name",
          "categoryId",
          "description",
          "details",
          "color",
          "priceCents",
          "isNew",
          "audience",
          "isGift",
          "images",
          "createdAt",
        ]),
        updatedAt: new Date(),
      },
    });

  const variants = productSeeds.flatMap(variantRows);
  const upsertVariants = db
    .insert(productVariants)
    .values(variants)
    .onConflictDoUpdate({
      target: productVariants.sku,
      set: {
        ...excluded(productVariants, [
          "productId",
          "color",
          "colorHex",
          "size",
          "stock",
          "sortOrder",
        ]),
        updatedAt: new Date(),
      },
    });

  // Variants removed from the seed data are deleted from seeded products.
  const deleteStaleVariants = db.delete(productVariants).where(
    and(
      inArray(
        productVariants.productId,
        db
          .select({ id: products.id })
          .from(products)
          .where(inArray(products.slug, productSeeds.map((p) => p.slug))),
      ),
      notInArray(
        productVariants.sku,
        variants.map((v) => v.sku),
      ),
    ),
  );

  // neon-http has no interactive transactions; a batch runs as one transaction.
  await db.batch([upsertCategories, upsertProducts, upsertVariants, deleteStaleVariants]);

  const [{ categoryCount }] = await db
    .select({ categoryCount: sql<number>`count(*)::int` })
    .from(categories);
  const [{ productCount }] = await db
    .select({ productCount: sql<number>`count(*)::int` })
    .from(products);
  const [{ variantCount }] = await db
    .select({ variantCount: sql<number>`count(*)::int` })
    .from(productVariants);
  console.log(
    `Seeded: ${categoryCount} categories, ${productCount} products, ${variantCount} variants`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
