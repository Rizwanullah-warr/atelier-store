import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { getAdminAccess } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Admin | Atelier Store",
  robots: { index: false },
};

// Every admin page checks the admin role itself and shows the reason to anyone
// else (src/components/admin/admin-denied.tsx); every admin action checks too.
// The layout only adds the admin header for admins, and always renders the
// page so each page's own check runs.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-24 md:px-8">
      {/* The session is request-time data, so the header streams in. */}
      <Suspense fallback={<div aria-hidden className="h-24" />}>
        <AdminHeader />
      </Suspense>
      <div className="pt-10">{children}</div>
    </div>
  );
}

async function AdminHeader() {
  const access = await getAdminAccess();
  if (access.status !== "admin") return null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 pt-10 md:pt-14">
        <div>
          <p className="label text-muted">Store Admin</p>
          <p className="mt-2 text-sm text-muted">Signed in as {access.email}</p>
        </div>
        <Link href="/" className="label link-underline">
          View Store
        </Link>
      </div>
      <div className="mt-6">
        <AdminNav />
      </div>
    </>
  );
}
