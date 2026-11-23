"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useCart } from "@/components/cart/cart-context";
import { authClient } from "@/lib/auth-client";
import {
  requestPasswordReset,
  sendVerificationEmail,
  type EmailActionResult,
} from "@/lib/account-actions";

type Mode = "sign-in" | "sign-up" | "forgot";

const inputClass =
  "mt-2 h-12 w-full border border-line bg-paper px-4 text-sm outline-none focus:border-ink";

export function AuthForms() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [emailResult, setEmailResult] = useState<EmailActionResult | null>(
    null,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (mode === "forgot") {
      setPending(true);
      setEmailResult(null);
      const result = await requestPasswordReset(form.get("email"));
      setPending(false);
      setEmailResult(result);
      return;
    }
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    setPending(true);
    setError(null);
    const { error } =
      mode === "sign-up"
        ? await authClient.signUp.email({
            name: String(form.get("name") ?? ""),
            email,
            password,
          })
        : await authClient.signIn.email({ email, password });
    setPending(false);

    if (error) {
      setError(error.message ?? "Something went wrong. Please try again.");
      return;
    }
    router.refresh();
  }

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setEmailResult(null);
  };

  return (
    <div className="mx-auto w-full max-w-md">
      {mode === "forgot" ? (
        <div className="border-b border-line py-4">
          <h2 className="label">Reset Password</h2>
        </div>
      ) : (
        <div role="tablist" className="grid grid-cols-2 border-b border-line">
          {(
            [
              ["sign-in", "Sign In"],
              ["sign-up", "Create Account"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => switchMode(value)}
              className={`label -mb-px border-b py-4 ${
                mode === value ? "border-ink" : "border-transparent text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {mode === "sign-up" && (
          <label className="block">
            <span className="label">Full Name</span>
            <input
              name="name"
              required
              autoComplete="name"
              className={inputClass}
            />
          </label>
        )}
        <label className="block">
          <span className="label">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </label>
        {mode === "forgot" && (
          <p className="text-sm text-muted">
            Enter your email and we&apos;ll send you a link to choose a new
            password.
          </p>
        )}
        {mode !== "forgot" && (
          <label className="block">
            <span className="label">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={
                mode === "sign-up" ? "new-password" : "current-password"
              }
              className={inputClass}
            />
            {mode === "sign-up" && (
              <span className="mt-2 block text-xs text-muted">
                At least 8 characters.
              </span>
            )}
          </label>
        )}

        {error && (
          <p role="alert" className="text-sm text-alert">
            {error}
          </p>
        )}

        {emailResult && <EmailNotice result={emailResult} />}

        <button
          type="submit"
          disabled={pending}
          className="btn btn-solid w-full"
        >
          {pending
            ? "Please wait…"
            : mode === "sign-up"
              ? "Create Account"
              : mode === "forgot"
                ? "Send Reset Link"
                : "Sign In"}
        </button>
        {mode === "sign-in" && (
          <button
            type="button"
            onClick={() => switchMode("forgot")}
            className="label link-underline mx-auto block text-muted"
          >
            Forgot password?
          </button>
        )}
        {mode === "forgot" && (
          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            className="label link-underline mx-auto block text-muted"
          >
            Back to sign in
          </button>
        )}
      </form>
    </div>
  );
}

// Result of an email action: success, "not set up", or a failure, in words.
export function EmailNotice({ result }: { result: EmailActionResult }) {
  return (
    <p
      role={result.status === "sent" ? "status" : "alert"}
      className={`text-sm ${result.status === "sent" ? "text-ink" : "text-alert"}`}
    >
      {result.message}
    </p>
  );
}

// Shown on /account while the email address is unverified.
export function VerifyEmailBanner({ email }: { email: string }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<EmailActionResult | null>(null);

  return (
    <div className="mb-8 border border-line bg-surface p-5 text-sm">
      <p>
        <span className="label mr-2">Email not verified</span>
        <span className="text-muted">{email}</span>
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setResult(await sendVerificationEmail());
          setPending(false);
        }}
        className="btn mt-4"
      >
        {pending ? "Sending�" : "Send Verification Email"}
      </button>
      {result && (
        <div className="mt-4">
          <EmailNotice result={result} />
        </div>
      )}
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const { detach } = useCart();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const { error } = await authClient.signOut();
        if (!error) detach();
        setPending(false);
        router.refresh();
      }}
      className="btn btn-solid"
    >
      {pending ? "Signing Out…" : "Sign Out"}
    </button>
  );
}
