// Loads the initial catalog. Safe to re-run: rows are upserted by slug.
// Run with `npm run db:seed`.

import { eq, getTableColumns, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { categorySeeds, productSeeds } from "@/db/seed/catalog-data";

// On conflict, overwrite every listed column with the incoming value.
const excluded = <T extends PgTable>(table: T, columns: string[]) => {
  const all = getTableColumns(table);
  return Object.fromEntries(
    columns.map((key) => [key, sql.raw(`excluded."${all[key].name}"`)]),
  );
};

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
      productSeeds.map(({ categorySlug, ...product }, index) => ({
        ...product,
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
          "stock",
          "isNew",
          "audience",
          "isGift",
          "sizes",
          "images",
          "createdAt",
        ]),
        updatedAt: new Date(),
      },
    });

  // neon-http has no interactive transactions; a batch runs as one transaction.
  await db.batch([upsertCategories, upsertProducts]);

  const [{ categoryCount }] = await db
    .select({ categoryCount: sql<number>`count(*)::int` })
    .from(categories);
  const [{ productCount }] = await db
    .select({ productCount: sql<number>`count(*)::int` })
    .from(products);
  console.log(`Seeded: ${categoryCount} categories, ${productCount} products`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
