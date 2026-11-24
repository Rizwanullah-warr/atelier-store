"use client";

import {
  ConfirmButton,
  Field,
  FormMessage,
  inputClass,
  textareaClass,
  useAdminForm,
} from "@/components/admin/form-kit";
import { removeReview, submitReview } from "@/lib/review-actions";

export function ReviewForm({
  slug,
  existing,
}: {
  slug: string;
  existing: { rating: number; title: string | null; body: string } | null;
}) {
  const { state, onSubmit, pending } = useAdminForm(submitReview);
  const errors = state.fieldErrors ?? {};

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-6 border border-line p-5" noValidate>
        <input type="hidden" name="slug" value={slug} />
        <h3 className="label">{existing ? "Edit Your Review" : "Write a Review"}</h3>

        <fieldset>
          <legend className="label mb-3">Rating</legend>
          {/* Stars are in reverse order (5 to 1) and shown 1 to 5, so the chosen
              star and every star after it in the markup are the lower ones. */}
          <div className="flex flex-row-reverse justify-end gap-1 [&>label:has(input:checked)~label>span]:text-ink">
            {[5, 4, 3, 2, 1].map((value) => (
              <label key={value} className="cursor-pointer">
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  defaultChecked={existing?.rating === value}
                  aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="text-3xl leading-none text-line peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-1"
                >
                  ★
                </span>
              </label>
            ))}
          </div>
          {errors.rating?.length ? (
            <span className="mt-2 block text-xs text-alert">{errors.rating[0]}</span>
          ) : null}
        </fieldset>

        <Field label="Title (optional)" error={errors.title}>
          <input
            name="title"
            maxLength={120}
            defaultValue={existing?.title ?? ""}
            aria-invalid={errors.title?.length ? true : undefined}
            className={inputClass}
          />
        </Field>
        <Field label="Your Review" error={errors.body}>
          <textarea
            name="body"
            rows={4}
            maxLength={2000}
            defaultValue={existing?.body ?? ""}
            aria-invalid={errors.body?.length ? true : undefined}
            className={textareaClass}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-6">
          <button type="submit" disabled={pending} className="btn btn-solid">
            {pending ? "Publishing…" : existing ? "Update Review" : "Publish Review"}
          </button>
          <FormMessage state={state} />
        </div>
      </form>
      {existing && (
        <ConfirmButton
          action={removeReview}
          fields={{ slug }}
          label="Delete My Review"
          confirmLabel="Yes, Delete My Review"
        />
      )}
    </div>
  );
}
