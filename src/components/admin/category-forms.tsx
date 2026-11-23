"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import {
  ConfirmButton,
  Field,
  FormMessage,
  inputClass,
  useAdminForm,
} from "@/components/admin/form-kit";
import { removeCategory, saveCategory } from "@/lib/admin-actions";

export type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  products: number;
};

const compactInput =
  "h-10 w-full border border-line bg-paper px-3 text-sm outline-none focus:border-ink aria-[invalid=true]:border-alert";

export function CategoryRow({ category }: { category: AdminCategory }) {
  const { state, onSubmit, pending } = useAdminForm(saveCategory);
  const errors = state.fieldErrors ?? {};

  return (
    <li className="py-4">
      <form
        onSubmit={onSubmit}
        aria-label={category.name}
        className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem_auto]"
        noValidate
      >
        <input type="hidden" name="id" value={category.id} />
        <input
          name="name"
          defaultValue={category.name}
          aria-label={`Name of ${category.name}`}
          aria-invalid={errors.name?.length ? true : undefined}
          className={compactInput}
        />
        <input
          name="slug"
          defaultValue={category.slug}
          aria-label={`Link name of ${category.name}`}
          aria-invalid={errors.slug?.length ? true : undefined}
          className={`${compactInput} font-mono text-xs`}
        />
        <input
          name="sortOrder"
          inputMode="numeric"
          defaultValue={category.sortOrder}
          aria-label={`Order of ${category.name}`}
          aria-invalid={errors.sortOrder?.length ? true : undefined}
          className={compactInput}
        />
        <button type="submit" disabled={pending} className="label link-underline justify-self-start">
          {pending ? "Saving…" : "Save"}
        </button>
        {(state.status !== "idle" || Object.keys(errors).length > 0) && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={`text-xs md:col-span-4 ${state.status === "error" ? "text-alert" : "text-muted"}`}
          >
            {errors.name?.[0] ?? errors.slug?.[0] ?? errors.sortOrder?.[0] ?? state.message}
          </p>
        )}
      </form>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted">
        <Link href={`/shop/${category.slug}`} className="link-underline">
          {category.products} {category.products === 1 ? "product" : "products"}
        </Link>
        {category.products === 0 ? (
          <ConfirmButton
            action={removeCategory}
            fields={{ id: category.id }}
            label="Delete"
            confirmLabel={`Delete ${category.name}`}
          />
        ) : (
          <span>Can be deleted once no products use it.</span>
        )}
      </div>
    </li>
  );
}

export function NewCategoryForm() {
  const { state, onSubmit, pending } = useAdminForm(saveCategory);
  const errors = state.fieldErrors ?? {};
  const invalid = (name: string) => (errors[name]?.length ? true : undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields once the category was added (errors keep what was typed).
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-5 border border-line p-5" noValidate>
      <h2 className="label">Add a Category</h2>
      <div className="grid gap-5 md:grid-cols-3">
        <Field label="Name" error={errors.name}>
          <input name="name" maxLength={60} aria-invalid={invalid("name")} className={inputClass} />
        </Field>
        <Field
          label="Link Name"
          error={errors.slug}
          hint="Its page is /shop/link-name. Leave empty to make it from the name."
        >
          <input name="slug" maxLength={100} aria-invalid={invalid("slug")} className={inputClass} />
        </Field>
        <Field label="Order" error={errors.sortOrder} hint="Lower numbers come first.">
          <input
            name="sortOrder"
            inputMode="numeric"
            defaultValue="0"
            aria-invalid={invalid("sortOrder")}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <button type="submit" disabled={pending} className="btn btn-solid">
          {pending ? "Adding…" : "Add Category"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
