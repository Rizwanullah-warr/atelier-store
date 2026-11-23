import Link from "next/link";
import { Suspense } from "react";

import { AdminDenied } from "@/components/admin/admin-denied";
import { ProductForm } from "@/components/admin/product-form";
import { listCategoriesWithCounts } from "@/db/queries/admin";
import { getAdminAccess } from "@/lib/admin";

export default function NewProductPage() {
  return (
    <Suspense fallback={<div aria-hidden className="h-96 animate-pulse bg-surface" />}>
      <NewProduct />
    </Suspense>
  );
}

async function NewProduct() {
  const access = await getAdminAccess();
  if (access.status !== "admin") return <AdminDenied access={access} />;
  const categories = await listCategoriesWithCounts();

  return (
    <div className="max-w-4xl space-y-8">
      <nav aria-label="Breadcrumb">
        <ol className="label flex items-center gap-2 text-muted">
          <li>
            <Link href="/admin/products" className="hover:text-ink">
              Products
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink">
            New
          </li>
        </ol>
      </nav>
      <div>
        <h1 className="font-serif text-4xl md:text-5xl">New Product</h1>
        <p className="mt-3 text-sm text-muted">
          After creating it, add its colours, sizes and stock on the next page.
        </p>
      </div>
      <ProductForm categories={categories} />
    </div>
  );
}
