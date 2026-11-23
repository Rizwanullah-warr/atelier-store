"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";

const inputClass =
  "mt-2 h-12 w-full border border-line bg-paper px-4 text-sm outline-none focus:border-ink";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const linkError = params.get("error");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="mx-auto max-w-md space-y-6 text-center">
        <p className="font-serif text-3xl">Password updated</p>
        <p className="text-sm text-muted">
          You can now sign in with your new password.
        </p>
        <Link href="/account" className="btn btn-solid">
          Go to Sign In
        </Link>
      </div>
    );
  }

  if (!token || linkError) {
    return (
      <div className="mx-auto max-w-md space-y-6 text-center">
        <p className="font-serif text-3xl">This link can&apos;t be used</p>
        <p className="text-sm text-muted">
          {linkError
            ? "The reset link is invalid or has expired."
            : "This page needs the link from your reset email."}{" "}
          Request a new one from the sign-in page.
        </p>
        <Link href="/account" className="btn btn-solid">
          Back to Sign In
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) {
      setError("The two passwords don't match.");
      return;
    }
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token: token!,
    });
    setPending(false);
    if (error) {
      setError(error.message ?? "We couldn't reset your password. Request a new link.");
      return;
    }
    setDone(true);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-5">
      <label className="block">
        <span className="label">New Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
        <span className="mt-2 block text-xs text-muted">At least 8 characters.</span>
      </label>
      <label className="block">
        <span className="label">Confirm Password</span>
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-solid w-full">
        {pending ? "Please wait…" : "Set New Password"}
      </button>
    </form>
  );
}
