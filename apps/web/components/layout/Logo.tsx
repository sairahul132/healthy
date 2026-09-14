import { cn } from "@/lib/utils/cn";

export function Logomark({
  className,
  inverted,
}: {
  className?: string;
  /** Outlined instead of filled, for placement on a brand-colored
   * background (e.g. the auth split panel) where the filled square would
   * blend into the background instead of reading as a mark. */
  inverted?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {inverted ? (
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="9"
          fill="none"
          stroke="var(--color-brand-foreground)"
          strokeWidth="1.4"
        />
      ) : (
        <rect x="0.5" y="0.5" width="31" height="31" rx="9.5" fill="var(--color-brand)" />
      )}
      <path
        d="M11 9v14M21 9v14M11 16h10"
        stroke="var(--color-brand-foreground)"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <circle cx="24.5" cy="10.5" r="2.5" fill="var(--color-accent)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-lg font-medium tracking-tight",
        // No default color: inherits the surrounding text color unless a
        // caller passes one — cn() only concatenates classes, so stacking
        // a default text-[...] here alongside a caller's override would
        // leave both in the class list with the winner decided by
        // stylesheet order, not JSX order.
        className,
      )}
    >
      Healthy
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Logomark className="h-8 w-8" />
      <Wordmark />
    </span>
  );
}

/** Sidebar variant with the "A Healthier You" tagline beneath the wordmark.
 * `inverted` matches Logomark's brand-panel mode — light wordmark/tagline
 * for placement on the solid brand-green sidebar instead of a light one. */
export function LogoBlock({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Logomark inverted={inverted} className="h-8 w-8" />
      <span className="flex flex-col leading-none">
        <Wordmark className={inverted ? "text-[var(--color-brand-foreground)]" : undefined} />
        <span
          className={cn(
            "mt-1 text-[11px] tracking-wide",
            inverted ? "text-[var(--color-brand-foreground)]/60" : "text-[var(--color-text-faint)]",
          )}
        >
          A Healthier You
        </span>
      </span>
    </span>
  );
}
