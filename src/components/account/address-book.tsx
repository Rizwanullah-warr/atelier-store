"use client";

import { useState, type FormEvent } from "react";

import type { SavedAddress } from "@/db/queries/account";
import {
  makeDefaultAddress,
  removeAddress,
  submitAddress,
  type AddressResult,
} from "@/lib/account-actions";

const inputClass =
  "mt-2 h-11 w-full border border-line bg-paper px-3 text-sm outline-none focus:border-ink";

type FieldProps = {
  label: string;
  name: string;
  value: string | null | undefined;
  required?: boolean;
  autoComplete?: string;
  type?: string;
  placeholder?: string;
  wide?: boolean;
};

function Field({ label, name, value, wide, ...input }: FieldProps) {
  return (
    <label className={`block ${wide ? "md:col-span-2" : ""}`}>
      <span className="label">{label}</span>
      <input name={name} defaultValue={value ?? ""} className={inputClass} {...input} />
    </label>
  );
}

export function AddressBook({ initial }: { initial: SavedAddress[] }) {
  const [addresses, setAddresses] = useState(initial);
  // "new", an address id being edited, or null when the form is closed.
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Server Functions throw when the session expired or the network drops.
  const run = async (task: () => Promise<AddressResult>) => {
    setBusy(true);
    try {
      const result = await task();
      if (result.ok) {
        setAddresses(result.addresses);
        setError(null);
        return true;
      }
      setError(result.error);
    } catch {
      setError("That didn't work. Check your connection and that you're still signed in.");
    } finally {
      setBusy(false);
    }
    return false;
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "");
    const id = editing && editing !== "new" ? editing : undefined;
    const saved = await run(() =>
      submitAddress(
        {
          label: field("label"),
          fullName: field("fullName"),
          line1: field("line1"),
          line2: field("line2"),
          city: field("city"),
          region: field("region"),
          postalCode: field("postalCode"),
          country: field("country"),
          phone: field("phone"),
          isDefault: form.get("isDefault") === "on",
        },
        id,
      ),
    );
    if (saved) setEditing(null);
  }

  const current = addresses.find((address) => address.id === editing);

  return (
    <div>
      {addresses.length === 0 && editing !== "new" && (
        <p className="text-sm text-muted">You haven&apos;t saved an address yet.</p>
      )}

      <ul className="grid gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <li key={address.id} className="border border-line p-5 text-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="label">{address.label || "Address"}</p>
              {address.isDefault && (
                <span className="label bg-surface px-2 py-1 text-[0.5625rem]">
                  Default
                </span>
              )}
            </div>
            <address className="mt-3 not-italic leading-relaxed text-muted">
              {address.fullName}
              <br />
              {address.line1}
              {address.line2 && (
                <>
                  <br />
                  {address.line2}
                </>
              )}
              <br />
              {address.city}
              {address.region && `, ${address.region}`} {address.postalCode}
              <br />
              {address.country}
              {address.phone && (
                <>
                  <br />
                  {address.phone}
                </>
              )}
            </address>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setEditing(address.id);
                }}
                className="label link-underline"
              >
                Edit
              </button>
              {!address.isDefault && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => makeDefaultAddress(address.id))}
                  className="label link-underline"
                >
                  Make Default
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => removeAddress(address.id))}
                className="label link-underline text-muted"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {error && editing === null && (
        <p role="alert" className="mt-4 text-sm text-alert">
          {error}
        </p>
      )}

      {editing === null ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setEditing("new");
          }}
          className="btn mt-6"
        >
          Add Address
        </button>
      ) : (
        <form
          key={editing}
          onSubmit={handleSubmit}
          className="mt-6 grid gap-4 border border-line p-5 md:grid-cols-2"
        >
          <h3 className="label md:col-span-2">
            {editing === "new" ? "New Address" : "Edit Address"}
          </h3>
          <Field label="Label (optional)" name="label" value={current?.label} placeholder="Home" />
          <Field label="Full Name" name="fullName" value={current?.fullName} required autoComplete="name" />
          <Field label="Address" name="line1" value={current?.line1} required autoComplete="address-line1" wide />
          <Field label="Apartment, suite (optional)" name="line2" value={current?.line2} autoComplete="address-line2" wide />
          <Field label="City" name="city" value={current?.city} required autoComplete="address-level2" />
          <Field label="State / Region (optional)" name="region" value={current?.region} autoComplete="address-level1" />
          <Field label="Postal Code" name="postalCode" value={current?.postalCode} required autoComplete="postal-code" />
          <Field label="Country" name="country" value={current?.country} required autoComplete="country-name" />
          <Field label="Phone (optional)" name="phone" value={current?.phone} type="tel" autoComplete="tel" wide />
          <label className="flex items-center gap-3 text-sm md:col-span-2">
            <input
              name="isDefault"
              type="checkbox"
              defaultChecked={current?.isDefault ?? false}
              className="size-4 accent-ink"
            />
            Use as my default address
          </label>
          {error && (
            <p role="alert" className="text-sm text-alert md:col-span-2">
              {error}
            </p>
          )}
          <div className="flex gap-3 md:col-span-2">
            <button type="submit" disabled={busy} className="btn btn-solid">
              {busy ? "Saving…" : "Save Address"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(null);
                setError(null);
              }}
              className="btn"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <p className="mt-6 text-xs text-muted">
        Saved addresses are kept for your reference. Checkout currently collects the
        shipping address on the Stripe payment page, so it is not filled in from here yet.
      </p>
    </div>
  );
}
