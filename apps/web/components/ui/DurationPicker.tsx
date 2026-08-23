"use client";

import { useState } from "react";

const DURATION_OPTIONS = [
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 24 * 7 },
  { label: "30 days", hours: 24 * 30 },
];

/** Preset-or-custom hours picker, shared by share creation and permission
 * roles. Uncontrolled about *how* the value was chosen (preset vs typed) —
 * only the resulting number of hours is reported via onChange. */
export function DurationPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (hours: number) => void;
  disabled?: boolean;
}) {
  const matchesPreset = DURATION_OPTIONS.some((o) => o.hours === value);
  const [isCustom, setIsCustom] = useState(!matchesPreset);
  const [customText, setCustomText] = useState(matchesPreset ? "" : String(value));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {DURATION_OPTIONS.map((option) => (
          <button
            key={option.hours}
            type="button"
            disabled={disabled}
            onClick={() => {
              setIsCustom(false);
              onChange(option.hours);
            }}
            className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              !isCustom && value === option.hours
                ? "border-[var(--color-brand)] bg-[var(--color-brand-tint)] text-[var(--color-brand)]"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsCustom(true)}
          className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            isCustom
              ? "border-[var(--color-brand)] bg-[var(--color-brand-tint)] text-[var(--color-brand)]"
              : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          Custom
        </button>
      </div>
      {isCustom ? (
        <input
          type="number"
          min={1}
          placeholder="Hours"
          value={customText}
          onChange={(e) => {
            setCustomText(e.target.value);
            const parsed = Number(e.target.value);
            if (Number.isFinite(parsed) && parsed > 0) onChange(parsed);
          }}
          disabled={disabled}
          className="mt-2 w-32 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] shadow-sm"
        />
      ) : null}
    </div>
  );
}
