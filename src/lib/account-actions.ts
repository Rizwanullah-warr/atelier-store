"use server";

import { headers } from "next/headers";
import { z } from "zod";

import {
  addWishlistSlugs,
  deleteAddress,
  getSavedBag,
  getWishlistSlugs,
  listAddresses,
  mergeIntoSavedBag,
  removeWishlistSlug,
  replaceSavedBag,
  saveAddress,
  setDefaultAddress,
  type BagLine,
  type SavedAddress,
} from "@/db/queries/account";
import { getProductsBySlugs } from "@/db/queries/products";
import { auth } from "@/lib/auth";
import { isEmailConfigured } from "@/lib/email";
import type { StorefrontProduct } from "@/lib/product-utils";

// Server Functions can be called by direct POST: every input is validated and
// every action works for the signed-in user only (checked here, not trusted
// from the client).

async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

// Loads and merges run on every page for signed-in customers and race with
// sign-out, so they answer null (nothing to do) instead of failing.
async function userIdOrNull() {
  return (await currentUser())?.id ?? null;
}

async function requireUserId() {
  const user = await currentUser();
  if (!user) throw new Error("Please sign in.");
  return user.id;
}

const slugList = z.array(z.string().min(1).max(200)).max(200);
const bagLines = z
  .array(
    z.object({
      sku: z.string().min(1).max(200),
      quantity: z.number().int().min(1).max(99),
    }),
  )
  .max(50);

// ---- Wishlist ----

export async function loadWishlist(): Promise<string[] | null> {
  const userId = await userIdOrNull();
  return userId ? getWishlistSlugs(userId) : null;
}

// Adds guest-saved slugs to the account and returns the combined list.
export async function mergeWishlist(slugs: unknown): Promise<string[] | null> {
  const parsedSlugs = slugList.parse(slugs);
  const userId = await userIdOrNull();
  if (!userId) return null;
  await addWishlistSlugs(userId, parsedSlugs);
  return getWishlistSlugs(userId);
}

export async function setWishlisted(slug: unknown, saved: unknown) {
  const userId = await requireUserId();
  const parsed = z.string().min(1).max(200).parse(slug);
  if (saved === true) await addWishlistSlugs(userId, [parsed]);
  else await removeWishlistSlug(userId, parsed);
}

// Public: product cards for the wishlist page (guests pass their local slugs).
export async function getWishlistProducts(
  slugs: unknown,
): Promise<StorefrontProduct[]> {
  return getProductsBySlugs(slugList.parse(slugs));
}

// ---- Bag ----

export async function loadSavedBag(): Promise<BagLine[] | null> {
  const userId = await userIdOrNull();
  return userId ? getSavedBag(userId) : null;
}

export async function mergeBag(lines: unknown): Promise<BagLine[] | null> {
  const parsed = bagLines.parse(lines);
  const userId = await userIdOrNull();
  return userId ? mergeIntoSavedBag(userId, parsed) : null;
}

// Returns false when the session is gone, so nothing was saved.
export async function saveBag(lines: unknown): Promise<boolean> {
  const parsed = bagLines.parse(lines);
  const userId = await userIdOrNull();
  if (!userId) return false;
  await replaceSavedBag(userId, parsed);
  return true;
}

// ---- Addresses ----

const text = (max: number) => z.string().trim().max(max);
const optional = (max: number) =>
  text(max).transform((value) => (value === "" ? null : value));

const addressSchema = z.object({
  label: optional(40),
  fullName: text(100).min(1, "Enter a full name."),
  line1: text(120).min(1, "Enter a street address."),
  line2: optional(120),
  city: text(80).min(1, "Enter a city."),
  region: optional(80),
  postalCode: text(20).min(1, "Enter a postal code."),
  country: text(80).min(1, "Enter a country."),
  phone: optional(30),
  isDefault: z.boolean(),
});

export type AddressResult =
  | { ok: true; addresses: SavedAddress[] }
  | { ok: false; error: string };

export async function loadAddresses(): Promise<SavedAddress[]> {
  return listAddresses(await requireUserId());
}

export async function submitAddress(
  input: unknown,
  id?: string,
): Promise<AddressResult> {
  const userId = await requireUserId();
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const saved = await saveAddress(userId, parsed.data, id);
  if (!saved) return { ok: false, error: "That address no longer exists." };
  return { ok: true, addresses: await listAddresses(userId) };
}

export async function makeDefaultAddress(id: unknown): Promise<AddressResult> {
  const userId = await requireUserId();
  await setDefaultAddress(userId, z.uuid().parse(id));
  return { ok: true, addresses: await listAddresses(userId) };
}

export async function removeAddress(id: unknown): Promise<AddressResult> {
  const userId = await requireUserId();
  await deleteAddress(userId, z.uuid().parse(id));
  return { ok: true, addresses: await listAddresses(userId) };
}

// ---- Password reset and email verification ----

export type EmailActionResult =
  | { status: "sent"; message: string }
  | { status: "not-configured"; message: string }
  | { status: "error"; message: string };

const NOT_CONFIGURED =
  "Email isn't set up on this store yet (RESEND_API_KEY is missing), so no email was sent.";

export async function requestPasswordReset(
  email: unknown,
): Promise<EmailActionResult> {
  const parsed = z.email().safeParse(typeof email === "string" ? email.trim() : "");
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address." };
  }
  if (!isEmailConfigured()) {
    return { status: "not-configured", message: NOT_CONFIGURED };
  }
  try {
    await auth.api.requestPasswordReset({
      body: { email: parsed.data, redirectTo: "/account/reset-password" },
    });
  } catch (error) {
    console.error("[auth] requestPasswordReset:", error);
    return {
      status: "error",
      message: "We couldn't start the reset right now. Please try again.",
    };
  }
  // Same answer whether or not the address has an account.
  return {
    status: "sent",
    message:
      "If an account exists for that address, a reset link is on its way. It works for one hour.",
  };
}

export async function sendVerificationEmail(): Promise<EmailActionResult> {
  const user = await currentUser();
  if (!user) return { status: "error", message: "Please sign in." };
  if (user.emailVerified) {
    return { status: "sent", message: "Your email is already verified." };
  }
  if (!isEmailConfigured()) {
    return { status: "not-configured", message: NOT_CONFIGURED };
  }
  try {
    await auth.api.sendVerificationEmail({
      body: { email: user.email, callbackURL: "/account?verified=1" },
    });
  } catch (error) {
    console.error("[auth] sendVerificationEmail:", error);
    return {
      status: "error",
      message:
        "The email service rejected the message, so nothing was sent. Check the server log for details.",
    };
  }
  return {
    status: "sent",
    message: `Verification link sent to ${user.email}. It works for 24 hours.`,
  };
}
