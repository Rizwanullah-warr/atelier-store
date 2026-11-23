"use client";

import {
  Field,
  FormMessage,
  inputClass,
  textareaClass,
  useAdminForm,
} from "@/components/admin/form-kit";
import { saveProduct } from "@/lib/admin-actions";

export type ProductFormValues = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  priceCents: number;
  description: string;
  details: string[];
  color: string | null;
  audience: "women" | "men" | "unisex";
  isNew: boolean;
  isGift: boolean;
  images: string[];
};

const priceText = (cents: number) =>
  cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);

export function ProductForm({
  categories,
  product,
}: {
  categories: { id: string; name: string }[];
  product?: ProductFormValues;
}) {
  const { state, onSubmit, pending } = useAdminForm(saveProduct);
  const errors = state.fieldErrors ?? {};
  const invalid = (name: string) => (errors[name]?.length ? true : undefined);

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Name" error={errors.name}>
          <input
            name="name"
            defaultValue={product?.name}
            required
            maxLength={120}
            aria-invalid={invalid("name")}
            className={inputClass}
          />
        </Field>
        <Field
          label="Link Name"
          error={errors.slug}
          hint="Used in the address /products/link-name. Leave empty to make it from the name."
        >
          <input
            name="slug"
            defaultValue={product?.slug}
            maxLength={100}
            aria-invalid={invalid("slug")}
            className={inputClass}
          />
        </Field>
        <Field label="Category" error={errors.categoryId}>
          <select
            name="categoryId"
            defaultValue={product?.categoryId ?? ""}
            required
            aria-invalid={invalid("categoryId")}
            className={inputClass}
          >
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Price (USD)" error={errors.price} hint="For example 2450 or 129.50.">
          <input
            name="price"
            inputMode="decimal"
            defaultValue={product ? priceText(product.priceCents) : ""}
            required
            aria-invalid={invalid("price")}
            className={inputClass}
          />
        </Field>
        <Field label="Shown To" error={errors.audience} hint="Decides the Women and Men pages.">
          <select
            name="audience"
            defaultValue={product?.audience ?? "unisex"}
            aria-invalid={invalid("audience")}
            className={inputClass}
          >
            <option value="women">Women</option>
            <option value="men">Men</option>
            <option value="unisex">Everyone</option>
          </select>
        </Field>
        <Field
          label="Colour in Photos"
          error={errors.color}
          hint={`Shown as "Shown in" when the product comes in several colours.`}
        >
          <input
            name="color"
            defaultValue={product?.color ?? ""}
            maxLength={60}
            aria-invalid={invalid("color")}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Description" error={errors.description}>
        <textarea
          name="description"
          defaultValue={product?.description}
          rows={4}
          maxLength={2000}
          required
          aria-invalid={invalid("description")}
          className={textareaClass}
        />
      </Field>

      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Details & Care" error={errors.details} hint="One line per detail.">
          <textarea
            name="details"
            defaultValue={product?.details.join("\n")}
            rows={6}
            aria-invalid={invalid("details")}
            className={textareaClass}
          />
        </Field>
        <Field
          label="Image Links"
          error={errors.images}
          hint="One https://images.unsplash.com/… link per line; the first is the main image. Uploading files is not set up yet."
        >
          <textarea
            name="images"
            defaultValue={product?.images.join("\n")}
            rows={6}
            aria-invalid={invalid("images")}
            className={`${textareaClass} font-mono text-xs`}
          />
        </Field>
      </div>

      <fieldset className="flex flex-wrap gap-8">
        <legend className="sr-only">Tags</legend>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="isNew" defaultChecked={product?.isNew} className="size-4" />
          New arrival
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="isGift" defaultChecked={product?.isGift} className="size-4" />
          Gift idea
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-6 border-t border-line pt-6">
        <button type="submit" disabled={pending} className="btn btn-solid">
          {pending ? "Saving…" : product ? "Save Changes" : "Create Product"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
