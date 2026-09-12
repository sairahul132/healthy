import type { ReactNode } from "react";
import Link from "next/link";
import { Logomark } from "./Logo";

interface AuthShellProps {
  /** Right-panel form heading. */
  title: string;
  description?: string;
  /** Small uppercase label above the left-panel headline, e.g. "Patient login". */
  panelKicker?: string;
  /** Left-panel (brand) headline — keep to ~6 words so it holds up at every
   * width. Screens without a specific message (share-recipient flows) fall
   * back to the generic tagline below instead of requiring one. */
  panelHeadline?: string;
  panelSubtext?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

/** Two-pane auth shell: a brand panel plus the form. Stacks to a single
 * column below `lg` (phones, portrait tablets) so the form is reachable
 * without horizontal scrolling; the brand panel collapses to a compact
 * header there instead of disappearing, so the page still reads as
 * Healthy's rather than a bare form. Uses min-h-screen (not a fixed
 * height) throughout so short/small viewports scroll instead of clipping
 * content, and each pane's own padding accounts for iOS safe areas.
 *
 * Used by the OTP verify screen and the share-recipient flow. Login and
 * register use PremiumAuthShell instead (the hero-scene redesign) — kept
 * separate so this one stays untouched by that work. */
export function AuthShell({
  title,
  description,
  panelKicker,
  panelHeadline,
  panelSubtext,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="flex min-h-screen w-full flex-col bg-[var(--color-bg)] lg:flex-row">
      <div
        className="relative flex shrink-0 flex-col gap-8 overflow-hidden bg-gradient-to-b from-[var(--color-brand)] to-[var(--color-brand-hover)] px-6 py-10 sm:px-10 sm:py-12 lg:w-[42%] lg:max-w-[480px] lg:justify-between lg:gap-0 lg:px-12 lg:py-14 lg:shadow-[10px_0_32px_-16px_rgb(var(--shadow-color)/0.35)]"
        style={{
          paddingTop: "max(2.5rem, env(safe-area-inset-top))",
          paddingLeft: "max(1.5rem, env(safe-area-inset-left))",
        }}
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -right-16 opacity-40 sm:opacity-50"
          width="300"
          height="300"
          viewBox="0 0 360 360"
        >
          <circle cx="180" cy="180" r="179" fill="none" stroke="var(--color-accent)" strokeOpacity="0.25" strokeWidth="1" />
          <circle cx="180" cy="180" r="130" fill="none" stroke="var(--color-accent)" strokeOpacity="0.25" strokeWidth="1" />
          <circle cx="180" cy="180" r="80" fill="none" stroke="var(--color-accent)" strokeOpacity="0.25" strokeWidth="1" />
        </svg>

        <Link href="/" className="relative inline-flex w-fit items-center gap-2.5 focus-visible:outline-none">
          <Logomark inverted className="h-7 w-7" />
          <span className="font-display text-lg font-medium text-[var(--color-brand-foreground)]">Healthy</span>
        </Link>

        <div className="relative">
          {panelHeadline ? (
            <>
              {panelKicker ? (
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                  {panelKicker}
                </p>
              ) : null}
              <h2 className="font-display max-w-[22ch] text-[26px] font-normal leading-[1.2] tracking-tight text-[var(--color-brand-foreground)] sm:text-[32px] lg:max-w-[19ch] lg:text-[36px]">
                {panelHeadline}
              </h2>
              {panelSubtext ? (
                <p className="mt-4 max-w-[38ch] text-sm leading-relaxed text-[var(--color-brand-foreground)]/70 lg:max-w-[32ch]">
                  {panelSubtext}
                </p>
              ) : null}
            </>
          ) : (
            <p className="max-w-[26ch] text-sm uppercase leading-relaxed tracking-[0.14em] text-[var(--color-brand-foreground)]/70">
              Your health data. Your vault. Your permission.
            </p>
          )}
        </div>

        <p className="relative hidden text-[11px] uppercase tracking-[0.2em] text-[var(--color-brand-foreground)]/50 lg:block">
          Private by design
        </p>
      </div>

      <div
        className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:px-16 lg:py-14"
        style={{
          paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
          paddingRight: "max(1.5rem, env(safe-area-inset-right))",
        }}
      >
        <div className="w-full max-w-[380px]">
          <h1 className="font-display text-[24px] font-medium tracking-tight text-[var(--color-text)] sm:text-[26px]">{title}</h1>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{description}</p>
          ) : null}
          <div className="mt-7">{children}</div>
          {footer ? <div className="mt-6 text-sm">{footer}</div> : null}
        </div>
      </div>
    </main>
  );
}
