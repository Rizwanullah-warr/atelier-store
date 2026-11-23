"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isForeignKeyViolation, isUniqueViolation } from "@/db/errors";
import {
  createCategory,
  createProduct,
  createVariant,
  deleteCategory,
  deleteProduct,
  deleteVariant,
  isUuid,
  setFulfillmentStatus,
  updateCategory,
  updateProduct,
  updateVariant,
  type ProductInput,
} from "@/db/queries/admin";
import { FULFILLMENT_STATUSES } from "@/db/schema/orders";
import { isAdmin } from "@/lib/admin";
import { curatedListings } from "@/lib/listings";
import { slugify } from "@/lib/product-utils";

// Admin mutations. Server Actions can be called by direct POST, so every one
// re-checks the admin role itself; the /admin pages' checks don't cover them.
// Catalog changes call updateTag("products") so the storefront (cached with
// that tag) shows them on the next request.

export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const DENIED: FormState = {
  status: "error",
  message: "Only store admins can do this. Sign in with an admin account.",
};

const invalid = (error: z.ZodError): FormState => ({
  status: "error",
  message: "Please fix the highlighted fields.",
  fieldErrors: z.flattenError(error).fieldErrors as FormState["fieldErrors"],
});

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();
const lines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugField = z
  .string()
  .min(1, "Enter a link name.")
  .max(100)
  .regex(SLUG, "Use lower-case letters, numbers and hyphens, like wool-coat.");

// next/image only loads from hosts allowed in next.config.ts, and there is no
// upload storage yet, so images are links to images.unsplash.com.
const isAllowedImage = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "images.unsplash.com";
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------- products

const productSchema = z.object({
  name: z.string().min(1, "Enter a name.").max(120),
  slug: slugField,
  categoryId: z.string().refine(isUuid, "Choose a category."),
  price: z
    .string()
    .regex(/^\d{1,7}(\.\d{1,2})?$/, "Enter a price in dollars, like 2450 or 129.50."),
  description: z.string().min(1, "Enter a description.").max(2000),
  details: z.array(z.string().max(200, "Keep each line under 200 characters.")).max(20, "Up to 20 lines."),
  color: z.string().max(60),
  audience: z.enum(["women", "men", "unisex"], "Choose who it is for."),
  isNew: z.boolean(),
  isGift: z.boolean(),
  images: z
    .array(z.string())
    .min(1, "Add at least one image link.")
    .max(12, "Up to 12 images.")
    .refine(
      (urls) => urls.every(isAllowedImage),
      "Each line must be an https://images.unsplash.com/… link.",
    ),
});

const toCents = (price: string) => {
  const [whole, fraction = ""] = price.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
};

export async function saveProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return DENIED;

  const id = text(formData, "id");
  const name = text(formData, "name");
  const parsed = productSchema.safeParse({
    name,
    slug: text(formData, "slug") || slugify(name),
    categoryId: text(formData, "categoryId"),
    price: text(formData, "price"),
    description: text(formData, "description"),
    details: lines(text(formData, "details")),
    color: text(formData, "color"),
    audience: text(formData, "audience"),
    isNew: formData.get("isNew") === "on",
    isGift: formData.get("isGift") === "on",
    images: lines(text(formData, "images")),
  });
  if (!parsed.success) return invalid(parsed.error);

  const { price, color, ...rest } = parsed.data;
  const input: ProductInput = { ...rest, color: color || null, priceCents: toCents(price) };

  let createdId: string | null = null;
  try {
    if (id) {
      if (!isUuid(id) || !(await updateProduct(id, input))) {
        return { status: "error", message: "This product no longer exists." };
      }
    } else {
      createdId = await createProduct(input);
    }
  } catch (error) {
    if (isUniqueViolation(error, "products_slug_unique")) {
      return {
        status: "error",
        message: "Please fix the highlighted fields.",
        fieldErrors: { slug: ["Another product already uses this link name."] },
      };
    }
    if (isForeignKeyViolation(error)) {
      return {
        status: "error",
        message: "Please fix the highlighted fields.",
        fieldErrors: { categoryId: ["That category no longer exists."] },
      };
    }
    throw error;
  }

  updateTag("products");
  // A new product has no variants yet; the edit page is where they are added.
  if (createdId) redirect(`/admin/products/${createdId}?created=1`);
  refresh();
  return { status: "success", message: "Saved. The store shows the changes now." };
}

export async function removeProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return DENIED;
  const id = text(formData, "id");
  if (!isUuid(id) || !(await deleteProduct(id))) {
    return { status: "error", message: "This product no longer exists." };
  }
  updateTag("products");
  redirect("/admin/products?deleted=1");
}

// ---------------------------------------------------------------- variants

const stockField = z
  .string()
  .regex(/^\d{1,6}$/, "Enter a whole number from 0 to 999999.")
  .transform(Number);
const hexField = z
  .string()
  .regex(/^(#[0-9a-fA-F]{6})?$/, "Use a colour code like #1C1C1C, or leave it empty.")
  .transform((value) => value || null);

const newVariantSchema = z.object({
  productId: z.string().refine(isUuid, "Unknown product."),
  color: z.string().min(1, "Enter a colour name.").max(40),
  colorHex: hexField,
  size: z
    .string()
    .max(20, "Keep sizes short, like M or 42.")
    .transform((value) => value || null),
  stock: stockField,
});

export async function addVariant(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return DENIED;
  const parsed = newVariantSchema.safeParse({
    productId: text(formData, "productId"),
    color: text(formData, "color"),
    colorHex: text(formData, "colorHex"),
    size: text(formData, "size"),
    stock: text(formData, "stock"),
  });
  if (!parsed.success) return invalid(parsed.error);

  const { productId, ...variant } = parsed.data;
  try {
    if (!(await createVariant(productId, variant))) {
      return { status: "error", message: "This product no longer exists." };
    }
  } catch (error) {
    if (
      isUniqueViolation(error, "product_variants_product_color_size_unique") ||
      isUniqueViolation(error, "product_variants_sku_unique")
    ) {
      return {
        status: "error",
        message: "This product already has that colour and size.",
      };
    }
    throw error;
  }
  updateTag("products");
  refresh();
  return { status: "success", message: "Variant added." };
}

const variantUpdateSchema = z.object({
  variantId: z.string().refine(isUuid, "Unknown variant."),
  stock: stockField,
  colorHex: hexField,
});

export async function saveVariant(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return DENIED;
  const parsed = variantUpdateSchema.safeParse({
    variantId: text(formData, "variantId"),
    stock: text(formData, "stock"),
    colorHex: text(formData, "colorHex"),
  });
  if (!parsed.success) return invalid(parsed.error);

  const { variantId, ...changes } = parsed.data;
  if (!(await updateVariant(variantId, changes))) {
    return { status: "error", message: "This variant no longer exists." };
  }
  updateTag("products");
  refresh();
  return { status: "success", message: "Saved." };
}

export async function removeVariant(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return DENIED;
  const variantId = text(formData, "variantId");
  if (!isUuid(variantId) || !(await deleteVariant(variantId))) {
    return { status: "error", message: "This variant no longer exists." };
  }
  updateTag("products");
  refresh();
  return { status: "success", message: "Variant deleted." };
}

// ---------------------------------------------------------------- categories

// Curated listings own these /shop/[slug] URLs, so a category can't use them.
const RESERVED_SLUGS = new Set(curatedListings.map((listing) => listing.slug));

const categorySchema = z.object({
  name: z.string().min(1, "Enter a name.").max(60),
  slug: slugField.refine(
    (slug) => !RESERVED_SLUGS.has(slug),
    "This link name is used by a store page; choose another.",
  ),
  sortOrder: z
    .string()
    .regex(/^-?\d{1,4}$/, "Enter a whole number.")
    .transform(Number),
});

export async function saveCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return DENIED;
  const id = text(formData, "id");
  const name = text(formData, "name");
  const parsed = categorySchema.safeParse({
    name,
    slug: text(formData, "slug") || slugify(name),
    sortOrder: text(formData, "sortOrder") || "0",
  });
  if (!parsed.success) return invalid(parsed.error);

  try {
    if (id) {
      if (!isUuid(id) || !(await updateCategory(id, parsed.data))) {
        return { status: "error", message: "This category no longer exists." };
      }
    } else {
      await createCategory(parsed.data);
    }
  } catch (error) {
    if (isUniqueViolation(error, "categories_slug_unique")) {
      return {
        status: "error",
        message: "Please fix the highlighted fields.",
        fieldErrors: { slug: ["Another category already uses this link name."] },
      };
    }
    throw error;
  }
  updateTag("products");
  refresh();
  return { status: "success", message: id ? "Saved." : "Category added." };
}

export async function removeCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return DENIED;
  const id = text(formData, "id");
  try {
    if (!isUuid(id) || !(await deleteCategory(id))) {
      return { status: "error", message: "This category no longer exists." };
    }
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return {
        status: "error",
        message: "Products still use this category. Move or delete them first.",
      };
    }
    throw error;
  }
  updateTag("products");
  refresh();
  return { status: "success", message: "Category deleted." };
}

// ---------------------------------------------------------------- orders

const fulfillmentSchema = z.object({
  orderId: z.string().refine(isUuid, "Unknown order."),
  status: z.enum(FULFILLMENT_STATUSES, "Choose a delivery status."),
});

export async function saveFulfillment(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return DENIED;
  const parsed = fulfillmentSchema.safeParse({
    orderId: text(formData, "orderId"),
    status: text(formData, "status"),
  });
  if (!parsed.success) return invalid(parsed.error);

  if (!(await setFulfillmentStatus(parsed.data.orderId, parsed.data.status))) {
    return { status: "error", message: "Only paid orders have a delivery status." };
  }
  refresh();
  return { status: "success", message: "Delivery status saved." };
}
