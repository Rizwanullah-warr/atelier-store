import Link from "next/link";

import { ReviewForm } from "@/components/reviews/review-form";
import { Stars } from "@/components/reviews/stars";
import { getOwnReview, getProductIdBySlug, getProductReviews, getReviewSummary, hasBoughtProduct } from "@/db/queries/reviews";
import { getViewer } from "@/lib/admin";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);

// Average rating under the product name; links to the reviews section.
export async function ReviewSummaryLink({ slug }: { slug: string }) {
  const { count, average } = await getReviewSummary(slug);
  if (count === 0) return null;
  return (
    <a href="#reviews" className="mt-3 inline-flex items-center gap-3 text-sm text-muted hover:text-ink">
      <Stars rating={average} />
      <span>
        {average.toFixed(1)} · {count} {count === 1 ? "review" : "reviews"}
      </span>
    </a>
  );
}

// Published reviews (cached, shared by everyone).
export async function ProductReviews({ slug }: { slug: string }) {
  const [summary, reviews] = await Promise.all([getReviewSummary(slug), getProductReviews(slug)]);

  return (
    <div className="space-y-8">
      {summary.count === 0 ? (
        <p className="text-sm text-muted">No reviews yet.</p>
      ) : (
        <>
          <p className="flex items-center gap-4">
            <Stars rating={summary.average} className="text-xl" />
            <span className="text-sm text-muted">
              {summary.average.toFixed(1)} out of 5 · {summary.count}{" "}
              {summary.count === 1 ? "review" : "reviews"}
            </span>
          </p>
          <ul className="divide-y divide-line border-y border-line">
            {reviews.map((review) => (
              <li key={review.id} className="space-y-2 py-6">
                <Stars rating={review.rating} />
                {review.title && <p className="font-medium">{review.title}</p>}
                <p className="text-sm leading-relaxed text-muted">{review.body}</p>
                <p className="label text-muted">
                  {review.author} · Verified buyer · {formatDate(review.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// Who may write a review: signed in, and bought this piece. Request-time data.
export async function ReviewComposer({ slug }: { slug: string }) {
  const session = await getViewer();
  if (!session) {
    return (
      <p className="text-sm text-muted">
        <Link href="/account" className="link-underline text-ink">
          Sign in
        </Link>{" "}
        to review a piece you bought.
      </p>
    );
  }
  const productId = await getProductIdBySlug(slug);
  if (!productId) return null;
  const [bought, existing] = await Promise.all([
    hasBoughtProduct(session.user.id, productId),
    getOwnReview(session.user.id, productId),
  ]);
  if (!bought) {
    return (
      <p className="text-sm text-muted">
        Only customers who bought this piece can review it.
      </p>
    );
  }
  return <ReviewForm slug={slug} existing={existing} />;
}
