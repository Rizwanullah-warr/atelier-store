"use client";

import { useEffect, useRef } from "react";

import {
  ConfirmButton,
  Field,
  FormMessage,
  inputClass,
  useAdminForm,
} from "@/components/admin/form-kit";
import { addVariant, removeVariant, saveVariant } from "@/lib/admin-actions";
import { getStockState } from "@/lib/product-utils";

export type AdminVariant = {
  id: string;
  sku: string;
  color: string;
  colorHex: string | null;
  size: string | null;
  stock: number;
};

const compactInput =
  "h-10 w-full border border-line bg-paper px-3 text-sm outline-none focus:border-ink aria-[invalid=true]:border-alert";

function VariantRow({ variant }: { variant: AdminVariant }) {
  const { state, onSubmit, pending } = useAdminForm(saveVariant);
  const errors = state.fieldErrors ?? {};
  const stockState = getStockState(variant.stock);

  return (
    <li className="py-4">
      <form
        onSubmit={onSubmit}
        aria-label={`${variant.color}${variant.size ? ` ${variant.size}` : ""}`}
        className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_7.5rem_auto]"
      >
        <input type="hidden" name="variantId" value={variant.id} />
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="size-6 shrink-0 border border-line"
            style={{ backgroundColor: variant.colorHex ?? undefined }}
          />
          <div className="text-sm">
            <p>
              {variant.color}
              {variant.size && <span className="text-muted"> · {variant.size}</span>}
            </p>
            <p className="font-mono text-[0.6875rem] text-muted">{variant.sku}</p>
          </div>
        </div>
        <label className="text-xs">
          <span className="sr-only">Stock</span>
          <input
            name="stock"
            inputMode="numeric"
            defaultValue={variant.stock}
            aria-label={`Stock for ${variant.color}${variant.size ? ` ${variant.size}` : ""}`}
            aria-invalid={errors.stock?.length ? true : undefined}
            className={compactInput}
          />
        </label>
        <label className="text-xs">
          <span className="sr-only">Colour code</span>
          <input
            name="colorHex"
            defaultValue={variant.colorHex ?? ""}
            placeholder="#1C1C1C"
            aria-label={`Colour code for ${variant.color}`}
            aria-invalid={errors.colorHex?.length ? true : undefined}
            className={`${compactInput} font-mono text-xs`}
          />
        </label>
        <div className="flex items-center gap-4">
          <button type="submit" disabled={pending} className="label link-underline">
            {pending ? "Saving…" : "Save"}
          </button>
          <span
            className={`text-xs ${
              stockState === "in-stock"
                ? "text-muted"
                : stockState === "low-stock"
                  ? "text-alert"
                  : "text-muted"
            }`}
          >
            {stockState === "sold-out" ? "Sold out" : stockState === "low-stock" ? "Low" : ""}
          </span>
        </div>
        {(state.status !== "idle" || errors.stock || errors.colorHex) && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={`text-xs sm:col-span-4 ${state.status === "error" ? "text-alert" : "text-muted"}`}
          >
            {errors.stock?.[0] ?? errors.colorHex?.[0] ?? state.message}
          </p>
        )}
      </form>
      <div className="mt-2">
        <ConfirmButton
          action={removeVariant}
          fields={{ variantId: variant.id }}
          label="Delete"
          confirmLabel={`Delete ${variant.color}${variant.size ? ` ${variant.size}` : ""}`}
        />
      </div>
    </li>
  );
}

function AddVariantForm({ productId }: { productId: string }) {
  const { state, onSubmit, pending } = useAdminForm(addVariant);
  const errors = state.fieldErrors ?? {};
  const invalid = (name: string) => (errors[name]?.length ? true : undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields once a variant was added (errors keep what was typed).
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="space-y-5 border border-line p-5"
      noValidate
    >
      <input type="hidden" name="productId" value={productId} />
      <h3 className="label">Add a Variant</h3>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Colour" error={errors.color}>
          <input name="color" maxLength={40} aria-invalid={invalid("color")} className={inputClass} />
        </Field>
        <Field label="Colour Code" error={errors.colorHex} hint="Optional, like #8A4B2A.">
          <input
            name="colorHex"
            placeholder="#8A4B2A"
            aria-invalid={invalid("colorHex")}
            className={`${inputClass} font-mono text-xs`}
          />
        </Field>
        <Field label="Size" error={errors.size} hint="Leave empty for one size.">
          <input name="size" maxLength={20} aria-invalid={invalid("size")} className={inputClass} />
        </Field>
        <Field label="Stock" error={errors.stock}>
          <input
            name="stock"
            inputMode="numeric"
            defaultValue="0"
            aria-invalid={invalid("stock")}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <button type="submit" disabled={pending} className="btn btn-solid">
          {pending ? "Adding…" : "Add Variant"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function VariantsEditor({
  productId,
  variants,
}: {
  productId: string;
  variants: AdminVariant[];
}) {
  return (
    <div className="space-y-8">
      {variants.length === 0 ? (
        <p className="border border-line bg-surface px-4 py-3 text-sm">
          This product has no variants yet, so the store shows it as sold out. Add at least one
          colour (and size, if it has sizes) below.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {variants.map((variant) => (
            <VariantRow key={variant.id} variant={variant} />
          ))}
        </ul>
      )}
      <AddVariantForm productId={productId} />
    </div>
  );
}
