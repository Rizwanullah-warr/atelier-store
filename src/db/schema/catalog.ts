import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    description: text("description").notNull(),
    details: text("details").array().notNull().default(sql`'{}'::text[]`),
    color: text("color"),
    priceCents: integer("price_cents").notNull(),
    // Stock lives on the product until variants (sizes/colours) exist.
    stock: integer("stock").notNull().default(0),
    isNew: boolean("is_new").notNull().default(false),
    // Who the piece is shown to: drives the Women / Men listings (unisex appears in both).
    audience: text("audience", { enum: ["women", "men", "unisex"] })
      .notNull()
      .default("unisex"),
    isGift: boolean("is_gift").notNull().default(false),
    // Selectable sizes; empty means one size. Stock is shared across sizes (no variants yet).
    sizes: text("sizes").array().notNull().default(sql`'{}'::text[]`),
    // images[0] is the main/card image; the rest form the gallery.
    images: text("images").array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("products_category_id_idx").on(table.categoryId),
    index("products_created_at_idx").on(table.createdAt),
    check("products_price_cents_non_negative", sql`${table.priceCents} >= 0`),
    check("products_stock_non_negative", sql`${table.stock} >= 0`),
    check(
      "products_audience_valid",
      sql`${table.audience} in ('women', 'men', 'unisex')`,
    ),
  ],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));
