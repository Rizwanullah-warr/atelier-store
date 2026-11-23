import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { auth } from "@/lib/auth";

// Who is making this request, read once per request (layout, page and actions
// share it). The role comes from the user row on every request, so granting or
// removing admin access takes effect immediately.
export const getViewer = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export type AdminAccess =
  | { status: "admin"; name: string; email: string }
  | { status: "signed-out" }
  | { status: "forbidden" };

export async function getAdminAccess(): Promise<AdminAccess> {
  const session = await getViewer();
  if (!session) return { status: "signed-out" };
  if (session.user.role !== "admin") return { status: "forbidden" };
  return { status: "admin", name: session.user.name, email: session.user.email };
}

export async function isAdmin() {
  return (await getAdminAccess()).status === "admin";
}
