import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-brand)]",
        className,
      )}
    />
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-[var(--color-text-muted)]">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)]/60 px-6 py-16 text-center">
      <h3 className="font-display text-base font-medium text-[var(--color-text)]">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--color-danger)]/25 bg-[var(--color-danger-tint)] px-6 py-10 text-center"
    >
      <h3 className="font-display text-base font-medium text-[var(--color-danger)]">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
