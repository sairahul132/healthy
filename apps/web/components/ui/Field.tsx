import { type InputHTMLAttributes, type ReactNode, forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** Optional leading icon (decorative, e.g. inside a glass-style form). */
  icon?: ReactNode;
}

/** Labelled text input with inline validation — label/hint/error are always
 * associated via aria attributes, never conveyed by color alone (§122). */
export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, hint, id, className, icon, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
        <div className="relative">
          {icon ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-[var(--color-text-faint)]"
            >
              {icon}
            </span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
            className={cn(
              "w-full rounded-xl border bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] shadow-sm transition-all duration-150",
              icon ? "pl-10" : "",
              error ? "border-[var(--color-danger)]" : "border-[var(--color-border-strong)]",
              "focus:border-[var(--color-brand)] focus:shadow-md",
              className,
            )}
            {...props}
          />
        </div>
        {hint && !error ? (
          <p id={hintId} className="text-xs text-[var(--color-text-muted)]">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="text-xs font-medium text-[var(--color-danger)]">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Field.displayName = "Field";
