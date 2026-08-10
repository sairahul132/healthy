import { cn } from "@/lib/utils/cn";

export function Logomark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="31" height="31" rx="9.5" fill="var(--color-brand)" />
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
    <span className={cn("font-display text-lg font-medium tracking-tight", className)}>
      Healthify
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
