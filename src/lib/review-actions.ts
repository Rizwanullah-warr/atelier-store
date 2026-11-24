"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";

import {
  deleteReview,
  getProductIdBySlug,
  hasBoughtProduct,
  saveReview,
} from "@/db/queries/reviews";
import { getViewer } from "@/lib/admin";
import type { FormState } from "@/lib/admin-actions";

// Server Actions are reachable by direct POST, so each one checks the session
// and the purchase itself; the product page's checks only decide what to show.

const reviewSchema = z.object({
  slug: z.string().min(1).max(200),
  rating: z
    .string()
    .regex(/^[1-5]$/, "Choose a rating from 1 to 5 stars.")
    .transform(Number),
  title: z
    .string()
    .max(120, "Keep the title under 120 characters.")
    .transform((value) => value || null),
  body: z
    .string()
    .min(10, "Write at least 10 characters.")
    .max(2000, "Keep the review under 2000 characters."),
});

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

async function reviewer(slug: string) {
  const session = await getViewer();
  if (!session) return { error: "Sign in to write a review." } as const;
  const productId = await getProductIdBySlug(slug);
  if (!productId) return { error: "This product no longer exists." } as const;
  if (!(await hasBoughtProduct(session.user.id, productId))) {
    return { error: "Only customers who bought this piece can review it." } as const;
  }
  return { userId: session.user.id, productId } as const;
}

export async function submitReview(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = reviewSchema.safeParse({
    slug: text(formData, "slug"),
    rating: text(formData, "rating"),
    title: text(formData, "title"),
    body: text(formData, "body"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as FormState["fieldErrors"],
    };
  }

  const who = await reviewer(parsed.data.slug);
  if ("error" in who) return { status: "error", message: who.error };

  const { rating, title, body } = parsed.data;
  await saveReview(who.userId, who.productId, { rating, title, body });
  updateTag("reviews");
  refresh();
  return { status: "success", message: "Thank you. Your review is published." };
}

export async function removeReview(_prev: FormState, formData: FormData): Promise<FormState> {
  const slug = text(formData, "slug");
  const session = await getViewer();
  if (!session) return { status: "error", message: "Sign in to manage your review." };
  const productId = await getProductIdBySlug(slug);
  if (!productId) return { status: "error", message: "This product no longer exists." };
  await deleteReview(session.user.id, productId);
  updateTag("reviews");
  refresh();
  return { status: "success", message: "Your review was deleted." };
}
