import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
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
    // The colour the product is photographed in ("Shown in …").
    color: text("color"),
    priceCents: integer("price_cents").notNull(),
    isNew: boolean("is_new").notNull().default(false),
    // Who the piece is shown to: drives the Women / Men listings (unisex appears in both).
    audience: text("audience", { enum: ["women", "men", "unisex"] })
      .notNull()
      .default("unisex"),
    isGift: boolean("is_gift").notNull().default(false),
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
    check(
      "products_audience_valid",
      sql`${table.audience} in ('women', 'men', 'unisex')`,
    ),
  ],
);

// One row per purchasable colour/size combination. Stock lives here.
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // Stable identifier used by the bag (and later by orders).
    sku: text("sku").notNull().unique(),
    color: text("color").notNull(),
    // CSS colour for the swatch; null falls back to the colour name only.
    colorHex: text("color_hex"),
    // Null means one size.
    size: text("size"),
    stock: integer("stock").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("product_variants_product_id_idx").on(table.productId),
    unique("product_variants_product_color_size_unique")
      .on(table.productId, table.color, table.size)
      .nullsNotDistinct(),
    check("product_variants_stock_non_negative", sql`${table.stock} >= 0`),
  ],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));
