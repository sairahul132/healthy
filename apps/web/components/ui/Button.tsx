import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--color-brand)] text-[var(--color-brand-foreground)] shadow-sm hover:bg-[var(--color-brand-hover)] hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:active:scale-100",
  secondary:
    "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100",
  danger:
    "bg-[var(--color-danger)] text-white shadow-sm hover:opacity-90 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100",
  ghost:
    "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] disabled:opacity-50",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-3.5 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-4.5 py-2.5 rounded-xl gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", isLoading, disabled, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium tracking-tight transition-all duration-150 ease-out cursor-pointer disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading ? (
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
