import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "./Logo";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--color-bg)] px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--color-brand-tint) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-9 flex flex-col items-center gap-3 text-center">
          <Link href="/" className="focus-visible:outline-none">
            <Logo />
          </Link>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-faint)]">
            Your health data. Your vault. Your permission.
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-lg sm:p-8">
          <h1 className="font-display text-2xl font-medium text-[var(--color-text)]">{title}</h1>
          {description ? (
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{description}</p>
          ) : null}
          <div className="mt-7">{children}</div>
        </div>
        {footer ? <div className="mt-6 text-center text-sm">{footer}</div> : null}
      </div>
    </main>
  );
}
