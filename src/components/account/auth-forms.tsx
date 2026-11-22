"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

const inputClass =
  "mt-2 h-12 w-full border border-line bg-paper px-4 text-sm outline-none focus:border-ink";

export function AuthForms() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
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
  };

  return (
    <div className="mx-auto w-full max-w-md">
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

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {mode === "sign-up" && (
          <label className="block">
            <span className="label">Full Name</span>
            <input name="name" required autoComplete="name" className={inputClass} />
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
        <label className="block">
          <span className="label">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            className={inputClass}
          />
          {mode === "sign-up" && (
            <span className="mt-2 block text-xs text-muted">At least 8 characters.</span>
          )}
        </label>

        {error && (
          <p role="alert" className="text-sm text-alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-solid w-full">
          {pending
            ? "Please wait…"
            : mode === "sign-up"
              ? "Create Account"
              : "Sign In"}
        </button>
      </form>
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.refresh();
      }}
      className="btn btn-solid"
    >
      {pending ? "Signing Out…" : "Sign Out"}
    </button>
  );
}
