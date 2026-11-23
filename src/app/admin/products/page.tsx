import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { AdminDenied } from "@/components/admin/admin-denied";
import { listAdminProducts } from "@/db/queries/admin";
import { getAdminAccess } from "@/lib/admin";
import { formatPrice, getStockState } from "@/lib/product-utils";

export default function AdminProductsPage(props: PageProps<"/admin/products">) {
  return (
    <Suspense fallback={<div aria-hidden className="h-96 animate-pulse bg-surface" />}>
      <ProductList searchParams={props.searchParams} />
    </Suspense>
  );
}

async function ProductList({
  searchParams,
}: {
  searchParams: PageProps<"/admin/products">["searchParams"];
}) {
  const access = await getAdminAccess();
  if (access.status !== "admin") return <AdminDenied access={access} />;

  const [products, { deleted }] = await Promise.all([listAdminProducts(), searchParams]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl md:text-5xl">Products</h1>
        <Link href="/admin/products/new" className="btn btn-solid">
          New Product
        </Link>
      </div>
      {deleted && (
        <p role="status" className="border border-line bg-surface px-4 py-3 text-sm">
          Product deleted. Past orders keep their own record of it.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-y border-line">
              <th className="label py-3 pr-4 font-normal text-muted">Product</th>
              <th className="label py-3 pr-4 font-normal text-muted">Category</th>
              <th className="label py-3 pr-4 font-normal text-muted">Price</th>
              <th className="label py-3 pr-4 font-normal text-muted">Stock</th>
              <th className="label py-3 font-normal text-muted">Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((product) => {
              const state = getStockState(product.stock);
              return (
                <tr key={product.id}>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="flex items-center gap-3 hover:underline"
                    >
                      <span className="relative aspect-[3/4] w-10 shrink-0 bg-surface">
                        {product.image && (
                          <Image
                            src={product.image}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        )}
                      </span>
                      {product.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-muted">{product.categoryName}</td>
                  <td className="py-3 pr-4">{formatPrice(product.priceCents)}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={
                        state === "in-stock"
                          ? ""
                          : state === "low-stock"
                            ? "text-alert"
                            : "text-muted"
                      }
                    >
                      {product.variants === 0
                        ? "No variants"
                        : state === "sold-out"
                          ? "Sold out"
                          : `${product.stock} in ${product.variants} ${product.variants === 1 ? "variant" : "variants"}`}
                    </span>
                  </td>
                  <td className="py-3 text-muted">
                    {[product.isNew && "New", product.isGift && "Gift"].filter(Boolean).join(" · ") ||
                      "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
