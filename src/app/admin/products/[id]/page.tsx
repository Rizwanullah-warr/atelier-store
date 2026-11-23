import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AdminDenied } from "@/components/admin/admin-denied";
import { ConfirmButton } from "@/components/admin/form-kit";
import { ProductForm } from "@/components/admin/product-form";
import { VariantsEditor } from "@/components/admin/variants-editor";
import { getAdminProduct, listCategoriesWithCounts } from "@/db/queries/admin";
import { getAdminAccess } from "@/lib/admin";
import { removeProduct } from "@/lib/admin-actions";

export default function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<div aria-hidden className="h-96 animate-pulse bg-surface" />}>
      <EditProduct params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function EditProduct({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/products/[id]">["params"];
  searchParams: PageProps<"/admin/products/[id]">["searchParams"];
}) {
  const access = await getAdminAccess();
  if (access.status !== "admin") return <AdminDenied access={access} />;

  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const [product, categories] = await Promise.all([
    getAdminProduct(id),
    listCategoriesWithCounts(),
  ]);
  if (!product) notFound();

  return (
    <div className="max-w-4xl space-y-14">
      <div className="space-y-6">
        <nav aria-label="Breadcrumb">
          <ol className="label flex items-center gap-2 text-muted">
            <li>
              <Link href="/admin/products" className="hover:text-ink">
                Products
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink">
              {product.name}
            </li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-serif text-4xl md:text-5xl">{product.name}</h1>
          <Link href={`/products/${product.slug}`} className="label link-underline">
            View in Store
          </Link>
        </div>
        {created && (
          <p role="status" className="border border-line bg-surface px-4 py-3 text-sm">
            Product created. Add at least one variant below so customers can buy it.
          </p>
        )}
      </div>

      <section className="space-y-6">
        <h2 className="label text-muted">Colours, Sizes and Stock</h2>
        {/* Keyed so moving to another product starts with fresh fields. */}
        <VariantsEditor key={product.id} productId={product.id} variants={product.variants} />
      </section>

      <section className="space-y-6">
        <h2 className="label text-muted">Details</h2>
        <ProductForm
          key={product.id}
          categories={categories}
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            categoryId: product.categoryId,
            priceCents: product.priceCents,
            description: product.description,
            details: product.details,
            color: product.color,
            audience: product.audience,
            isNew: product.isNew,
            isGift: product.isGift,
            images: product.images,
          }}
        />
      </section>

      <section className="space-y-4 border-t border-line pt-6">
        <h2 className="label text-alert">Delete Product</h2>
        <p className="max-w-xl text-sm text-muted">
          Removes the product and all its variants from the store. Past orders keep their own
          record of what was bought.
        </p>
        <ConfirmButton
          action={removeProduct}
          fields={{ id: product.id }}
          label="Delete Product"
          confirmLabel={`Yes, Delete ${product.name}`}
          className="btn border-alert text-alert"
        />
      </section>
    </div>
  );
}
