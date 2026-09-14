import type { ReactNode } from "react";
import Link from "next/link";
import { VaultDoor } from "./VaultDoor";

interface PremiumAuthShellProps {
  /** Small uppercase label above the page-level headline, e.g. "Patient login". */
  kicker: string;
  /** Large serif headline shown once, above the capsule. */
  pageHeadline: string;
  /** Small uppercase label at the top of the capsule's dark panel. */
  panelMark: string;
  /** Supporting headline inside the dark panel — distinct from
   * `pageHeadline` so the two don't just repeat each other. */
  panelHeadline: string;
  panelBody: string;
  /** Optional chip rendered under the dark panel's copy — used by the
   * verify page to surface the masked phone number being confirmed. */
  panelBadge?: ReactNode;
  formTitle: string;
  formDescription: string;
  /** Paired with `headerCtaLabel`/`headerCtaHref` to render "<question>
   * <pill link>" (login/register). Omit to render `headerCtaLabel` as a
   * plain back-arrow link instead (verify's "Wrong number?"). */
  headerQuestion?: string;
  headerCtaLabel: string;
  headerCtaHref: string;
  children: ReactNode;
}

/** Shared shell for login, register and verify — a capsule-shaped panel
 * (a lozenge, not a literal full stadium: the radius is capped so content
 * never runs into the curve regardless of how tall a given page's form
 * is) split by a gold seam into a dark brand half and a light form half,
 * with a small "H" medallion sitting on the seam. Below `lg` there isn't
 * room for two panels side by side, so the halves stack — dark copy block
 * on top with rounded bottom corners, form card below — and the medallion
 * moves to sit on that horizontal seam instead so the brand mark survives
 * the breakpoint change.
 *
 * The dark panel carries a VaultDoor graphic (`seal` text off — too fine
 * to read at this scale) bleeding off the bottom-left corner, echoing the
 * landing page's hero so the whole signed-out funnel shares one motif.
 *
 * Replaces the old split hero-photo layout. AuthShell (a different,
 * plainer two-pane component) still exists separately for the
 * share-recipient flow, which has no reason to pick up this treatment. */
export function PremiumAuthShell({
  kicker,
  pageHeadline,
  panelMark,
  panelHeadline,
  panelBody,
  panelBadge,
  formTitle,
  formDescription,
  headerQuestion,
  headerCtaLabel,
  headerCtaHref,
  children,
}: PremiumAuthShellProps) {
  return (
    <main
      className="flex min-h-dvh w-full flex-col items-center bg-[var(--color-bg)] px-5 py-6 sm:px-8 sm:py-8 lg:py-10"
      style={{
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex w-full max-w-[1220px] items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 focus-visible:outline-none">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--color-brand)] sm:h-9 sm:w-9">
            <span className="font-display text-sm font-bold text-[var(--color-brand)] sm:text-base">H</span>
          </span>
          <span className="font-display text-base font-semibold tracking-tight text-[var(--color-brand)] sm:text-lg">
            Healthy
          </span>
        </Link>

        {headerQuestion ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[var(--color-text-muted)] sm:inline">{headerQuestion}</span>
            <Link
              href={headerCtaHref}
              className="inline-flex min-h-9 items-center rounded-full border border-[var(--color-brand)] px-4 py-1.5 text-xs font-medium text-[var(--color-brand)] transition-colors hover:bg-[var(--color-brand)]/5 sm:text-sm"
            >
              {headerCtaLabel}
            </Link>
          </div>
        ) : (
          <Link
            href={headerCtaHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-brand)] hover:underline"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {headerCtaLabel}
          </Link>
        )}
      </div>

      <div className="flex w-full max-w-[1220px] flex-1 flex-col items-center justify-center py-8 lg:py-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          {kicker}
        </p>
        <h1 className="font-display mt-2 max-w-2xl text-center text-[26px] font-medium leading-[1.15] tracking-tight text-[var(--color-text)] sm:text-[32px] lg:text-[38px]">
          {pageHeadline}
        </h1>

        <div className="relative mt-8 w-full max-w-[1080px] overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_28px_64px_-26px_rgb(var(--shadow-color)/0.45)] sm:mt-10 lg:flex lg:rounded-[64px]">
          <div className="relative flex flex-col gap-3 overflow-hidden bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-hover)] px-7 py-8 sm:px-10 sm:py-10 lg:w-[42%] lg:justify-center lg:px-14 lg:py-12">
            <div className="pointer-events-none absolute -bottom-44 -left-36 opacity-45 sm:-bottom-40 sm:-left-32">
              <VaultDoor className="w-64 sm:w-80 lg:w-96" showSeal={false} />
            </div>
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-bright)]">
              {panelMark}
            </p>
            <h2 className="font-display relative max-w-sm text-[19px] font-medium leading-snug text-[var(--color-brand-foreground)] sm:text-[22px] lg:text-[24px]">
              {panelHeadline}
            </h2>
            <p className="relative max-w-xs text-[13px] leading-relaxed text-[var(--color-brand-foreground)]/70 sm:text-[13.5px]">
              {panelBody}
            </p>
            {panelBadge ? <div className="relative mt-4">{panelBadge}</div> : null}
          </div>

          <div className="relative hidden shrink-0 lg:block lg:w-px">
            <div className="absolute inset-y-10 left-0 w-px bg-gradient-to-b from-transparent via-[var(--color-accent-bright)] to-transparent opacity-80" />
            <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[var(--color-accent-bright)] bg-[var(--color-surface)]">
              <span className="font-display text-sm font-semibold text-[var(--color-accent)]">H</span>
            </div>
          </div>

          <div className="relative z-10 -mt-[18px] flex justify-center lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--color-accent-bright)] bg-[var(--color-surface)] shadow-sm">
              <span className="font-display text-sm font-semibold text-[var(--color-accent)]">H</span>
            </div>
          </div>

          <div className="px-7 pb-9 pt-4 sm:px-10 sm:pb-10 lg:flex lg:w-[58%] lg:flex-col lg:justify-center lg:px-14 lg:py-12">
            <h3 className="font-display text-[20px] font-medium tracking-tight text-[var(--color-text)] sm:text-[22px]">
              {formTitle}
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-text-muted)] sm:text-sm">
              {formDescription}
            </p>
            <div className="mt-5 sm:mt-6">{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
