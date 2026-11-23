"use client";

import { Field, FormMessage, inputClass, useAdminForm } from "@/components/admin/form-kit";
import type { FulfillmentStatus } from "@/db/schema/orders";
import { saveFulfillment } from "@/lib/admin-actions";
import { FULFILLMENT_LABEL } from "@/lib/order-format";

export function FulfillmentForm({
  orderId,
  status,
}: {
  orderId: string;
  status: FulfillmentStatus;
}) {
  const { state, onSubmit, pending } = useAdminForm(saveFulfillment);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-56">
          <Field label="Delivery Status" error={state.fieldErrors?.status}>
            <select name="status" defaultValue={status} className={inputClass}>
              {(Object.keys(FULFILLMENT_LABEL) as FulfillmentStatus[]).map((value) => (
                <option key={value} value={value}>
                  {FULFILLMENT_LABEL[value]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <button type="submit" disabled={pending} className="btn btn-solid">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      <FormMessage state={state} />
      <p className="text-xs text-muted">
        Customers see this on their order page. No email is sent: emails are not set up yet.
      </p>
    </form>
  );
}
