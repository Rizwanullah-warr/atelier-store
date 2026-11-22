"use client";

export function QuantityStepper({
  value,
  max,
  label,
  onChange,
}: {
  value: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="inline-flex h-10 items-center border border-line">
      <button
        type="button"
        aria-label={`Decrease quantity of ${label}`}
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        className="grid h-full w-10 place-items-center disabled:text-line"
      >
        −
      </button>
      <span aria-live="polite" aria-label={`Quantity ${value}`} className="w-8 text-center text-sm">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase quantity of ${label}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="grid h-full w-10 place-items-center disabled:text-line"
      >
        +
      </button>
    </div>
  );
}
