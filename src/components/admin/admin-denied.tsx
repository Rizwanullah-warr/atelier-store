import Link from "next/link";

import type { AdminAccess } from "@/lib/admin";

// Shown instead of any admin page to visitors who are not admins.
export function AdminDenied({ access }: { access: Exclude<AdminAccess, { status: "admin" }> }) {
  return (
    <header className="py-12 text-center md:py-20">
      <p className="label text-muted">Store Admin</p>
      <h1 className="mt-3 font-serif text-4xl md:text-6xl">
        {access.status === "signed-out" ? "Sign in to continue" : "Admins only"}
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted">
        {access.status === "signed-out"
          ? "This area is for store administrators. Sign in with an admin account."
          : "Your account does not have admin access. An existing admin can grant it with npm run user:role."}
      </p>
      <Link
        href={access.status === "signed-out" ? "/account" : "/"}
        className="btn btn-solid mt-8"
      >
        {access.status === "signed-out" ? "Sign In" : "Back to the Store"}
      </Link>
    </header>
  );
}
