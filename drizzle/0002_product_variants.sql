CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"color" text NOT NULL,
	"color_hex" text,
	"size" text,
	"stock" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku"),
	CONSTRAINT "product_variants_product_color_size_unique" UNIQUE NULLS NOT DISTINCT("product_id","color","size"),
	CONSTRAINT "product_variants_stock_non_negative" CHECK ("product_variants"."stock" >= 0)
);
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_stock_non_negative";--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
-- Data move (hand-written): turn each product's shared stock into variants
-- before the old columns are dropped. One-size products get a single variant;
-- sized products split their stock evenly across sizes (remainder to the
-- first sizes). SKUs match skuFor() in src/lib/product-utils.ts.
INSERT INTO "product_variants" ("product_id", "sku", "color", "size", "stock", "sort_order")
SELECT
	p."id",
	p."slug" || '-' || trim(both '-' from lower(regexp_replace(coalesce(p."color", 'default'), '[^a-zA-Z0-9]+', '-', 'g')))
		|| coalesce('-' || trim(both '-' from lower(regexp_replace(s."size", '[^a-zA-Z0-9]+', '-', 'g'))), ''),
	coalesce(p."color", 'Default'),
	s."size",
	CASE
		WHEN s."size" IS NULL THEN p."stock"
		ELSE p."stock" / cardinality(p."sizes") + CASE WHEN s."ord" <= p."stock" % cardinality(p."sizes") THEN 1 ELSE 0 END
	END,
	coalesce(s."ord", 1)::int - 1
FROM "products" p
CROSS JOIN LATERAL (
	SELECT u."size", u."ord" FROM unnest(p."sizes") WITH ORDINALITY AS u("size", "ord")
	UNION ALL
	SELECT NULL, NULL WHERE cardinality(p."sizes") = 0
) s;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "stock";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "sizes";