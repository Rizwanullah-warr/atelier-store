// Star rating for display, e.g. 4.5 shows four and a half filled stars.
export function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  const percent = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <span
      role="img"
      aria-label={`${rating} out of 5 stars`}
      className={`relative inline-block whitespace-nowrap leading-none tracking-[0.15em] ${className}`}
    >
      <span aria-hidden className="text-line">
        ★★★★★
      </span>
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 overflow-hidden text-ink"
        style={{ width: `${percent}%` }}
      >
        ★★★★★
      </span>
    </span>
  );
}
