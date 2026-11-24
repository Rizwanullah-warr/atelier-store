"use client"; // Error boundaries must be Client Components.

import Link from "next/link";
import { useEffect } from "react";

// Shown when a page fails, e.g. the database can't be reached for a moment.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-32 text-center">
      <p className="label text-muted">Something went wrong</p>
      <h1 className="mt-4 font-serif text-4xl md:text-5xl">This page didn&apos;t load</h1>
      <p className="mt-4 text-sm text-muted">
        It may be a brief connection problem. Please try again.
      </p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={() => retry()} className="btn btn-solid">
          Try Again
        </button>
        <Link href="/" className="btn">
          Go Home
        </Link>
      </div>
    </section>
  );
}
