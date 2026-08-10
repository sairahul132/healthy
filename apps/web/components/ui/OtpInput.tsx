"use client";

import { type ClipboardEvent, type KeyboardEvent, useRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

/** Six-box OTP entry. Keeps a single source of truth (the digit string) and
 * only uses the boxes as a focus/display affordance. */
export function OtpInput({ length = 6, value, onChange, error, disabled }: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(length, " ").slice(0, length).split("");

  function setDigit(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join("").trimEnd());
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index]?.trim() && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div>
      <div className="flex gap-2" role="group" aria-label="One-time passcode">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            value={digit.trim()}
            onChange={(event) => setDigit(index, event.target.value.replace(/\D/g, "").slice(-1))}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            disabled={disabled}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            aria-label={`Digit ${index + 1} of ${length}`}
            className={cn(
              "font-display h-13 w-11 rounded-xl border bg-[var(--color-surface)] text-center text-xl font-medium text-[var(--color-text)] shadow-sm transition-all duration-150",
              error ? "border-[var(--color-danger)]" : "border-[var(--color-border-strong)]",
              "focus:border-[var(--color-brand)] focus:shadow-md",
            )}
          />
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
