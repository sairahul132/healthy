"use client";

import { type InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";

export interface PhoneInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  label: string;
  error?: string;
  /** Digits only, no country code. */
  value: string;
  onValueChange: (digits: string) => void;
}

/** Fixed +91 country code — matches the app's current market, and the
 * backend's phone regex expects a single E.164-ish value, so there's no
 * dropdown wired to alternate country codes yet (visually present per the
 * design brief, functionally single-option for now). */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, error, value, onValueChange, id, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1 sm:gap-1.5">
        <label htmlFor={inputId} className="text-xs font-medium text-[var(--color-text)] sm:text-sm">
          {label}
        </label>
        <div
          className={cn(
            "flex h-11 items-center rounded-lg border bg-[var(--color-surface)] shadow-sm transition-all duration-150 focus-within:border-[var(--color-brand)] focus-within:shadow-md sm:h-14 sm:rounded-xl",
            error ? "border-[var(--color-danger)]" : "border-[var(--color-border)]",
          )}
        >
          <span className="flex shrink-0 items-center gap-1 pl-3 pr-2 text-xs text-[var(--color-text)] sm:gap-1.5 sm:pl-4 sm:pr-3 sm:text-sm" aria-hidden="true">
            <span className="text-sm leading-none sm:text-base">🇮🇳</span>
            <span className="font-medium">+91</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-[var(--color-text-faint)]">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="h-5 w-px shrink-0 bg-[var(--color-border)] sm:h-6" aria-hidden="true" />
          <input
            ref={ref}
            id={inputId}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={errorId}
            value={value}
            onChange={(event) => onValueChange(event.target.value.replace(/\D/g, "").slice(0, 10))}
            className={cn(
              "h-full min-w-0 flex-1 rounded-r-lg bg-transparent px-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none sm:rounded-r-xl sm:px-3 sm:text-[15px]",
              className,
            )}
            {...props}
          />
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-xs font-medium text-[var(--color-danger)]">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
PhoneInput.displayName = "PhoneInput";
