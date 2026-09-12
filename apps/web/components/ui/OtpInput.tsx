"use client";

import { type ClipboardEvent, type KeyboardEvent, useRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  /** Fires on Enter/Return so a filled code can be submitted from the
   * keyboard without reaching for the mouse. */
  onEnter?: () => void;
  error?: string;
  disabled?: boolean;
}

/** Six-box OTP entry. Keeps a single source of truth (the digit string) and
 * only uses the boxes as a focus/display affordance. */
export function OtpInput({ length = 6, value, onChange, onEnter, error, disabled }: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(length, " ").slice(0, length).split("");

  function fillFrom(digitsOnly: string) {
    const next = digitsOnly.slice(0, length);
    onChange(next);
    inputRefs.current[Math.min(next.length, length - 1)]?.focus();
  }

  function setDigit(index: number, raw: string) {
    const digitsOnly = raw.replace(/\D/g, "");
    // Safari/macOS "from Messages" autofill (and some paste flows) delivers
    // the whole code into whichever box is focused, not one digit at a
    // time — treat that the same as a paste instead of keeping only the
    // last character.
    if (digitsOnly.length > 1) {
      fillFrom(digitsOnly);
      return;
    }
    const next = digits.slice();
    next[index] = digitsOnly;
    onChange(next.join("").trimEnd());
    if (digitsOnly && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onEnter?.();
      return;
    }
    if (event.key === "Backspace" && !digits[index]?.trim() && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    event.preventDefault();
    fillFrom(pasted);
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
            onChange={(event) => setDigit(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            disabled={disabled}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            // Box 0 accepts up to the full code length: Safari/macOS's
            // "from Messages" one-time-code autofill fills the whole
            // string into whichever field carries autoComplete
            // "one-time-code", not one digit at a time — maxLength=1 there
            // would silently truncate it before onChange ever sees it.
            maxLength={index === 0 ? length : 1}
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
