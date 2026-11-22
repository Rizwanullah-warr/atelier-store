import { getStockState } from "@/lib/product-utils";

const styles = {
  "in-stock": { dot: "bg-accent", text: "text-ink" },
  "low-stock": { dot: "bg-alert", text: "text-alert" },
  "sold-out": { dot: "bg-muted", text: "text-muted" },
};

export function StockStatus({ stock }: { stock: number }) {
  const state = getStockState(stock);
  const label =
    state === "sold-out"
      ? "Sold out"
      : state === "low-stock"
        ? `Only ${stock} left`
        : "In stock";

  return (
    <p className={`flex items-center gap-2 text-sm ${styles[state].text}`}>
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${styles[state].dot}`}
      />
      {label}
    </p>
  );
}
