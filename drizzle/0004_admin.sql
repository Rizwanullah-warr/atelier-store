ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'customer' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfillment_status" text DEFAULT 'unfulfilled' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfillment_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_valid" CHECK ("user"."role" in ('customer', 'admin'));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_fulfillment_status_valid" CHECK ("orders"."fulfillment_status" in ('unfulfilled', 'shipped', 'delivered'));