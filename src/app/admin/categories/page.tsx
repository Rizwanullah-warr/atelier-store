import { Suspense } from "react";

import { AdminDenied } from "@/components/admin/admin-denied";
import { CategoryRow, NewCategoryForm } from "@/components/admin/category-forms";
import { listCategoriesWithCounts } from "@/db/queries/admin";
import { getAdminAccess } from "@/lib/admin";

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={<div aria-hidden className="h-96 animate-pulse bg-surface" />}>
      <Categories />
    </Suspense>
  );
}

async function Categories() {
  const access = await getAdminAccess();
  if (access.status !== "admin") return <AdminDenied access={access} />;
  const categories = await listCategoriesWithCounts();

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="font-serif text-4xl md:text-5xl">Categories</h1>
        <p className="mt-3 text-sm text-muted">
          Each category has its own page at /shop/link-name and appears in product breadcrumbs.
        </p>
      </div>
      <div>
        <div className="label hidden gap-3 pb-3 text-muted md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem_auto]">
          <span>Name</span>
          <span>Link Name</span>
          <span>Order</span>
          <span className="w-10" />
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </ul>
      </div>
      <NewCategoryForm />
    </div>
  );
}
