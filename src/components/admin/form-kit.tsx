"use client";

import {
  startTransition,
  useActionState,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import type { FormState } from "@/lib/admin-actions";

const IDLE: FormState = { status: "idle" };

// Runs a server action from onSubmit instead of <form action>, so React does
// not reset the fields after submitting: a rejected form keeps what was typed.
export function useAdminForm(
  action: (state: FormState, formData: FormData) => Promise<FormState>,
) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };
  return { state, onSubmit, pending };
}

export const inputClass =
  "mt-2 h-11 w-full border border-line bg-paper px-3 text-sm outline-none focus:border-ink aria-[invalid=true]:border-alert";
export const textareaClass =
  "mt-2 w-full border border-line bg-paper px-3 py-2 text-sm leading-relaxed outline-none focus:border-ink aria-[invalid=true]:border-alert";

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string[];
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error?.length ? (
        <span className="mt-2 block text-xs text-alert">{error[0]}</span>
      ) : hint ? (
        <span className="mt-2 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={`text-sm ${state.status === "error" ? "text-alert" : "text-ink"}`}
    >
      {state.message}
    </p>
  );
}

// A destructive action that needs a second click to confirm.
export function ConfirmButton({
  action,
  fields,
  label,
  confirmLabel,
  className = "label link-underline text-alert",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  fields: Record<string, string>;
  label: string;
  confirmLabel: string;
  className?: string;
}) {
  const { state, onSubmit, pending } = useAdminForm(action);
  const [armed, setArmed] = useState(false);

  return (
    <form onSubmit={onSubmit} className="inline-flex flex-wrap items-center gap-3">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {armed ? (
        <>
          <button type="submit" disabled={pending} className={className}>
            {pending ? "Working…" : confirmLabel}
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="label link-underline text-muted"
          >
            Cancel
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setArmed(true)} className={className}>
          {label}
        </button>
      )}
      {state.status === "error" && (
        <span role="alert" className="text-xs text-alert">
          {state.message}
        </span>
      )}
    </form>
  );
}
