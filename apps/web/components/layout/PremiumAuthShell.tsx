import { statSync } from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import Link from "next/link";
import { HeroSceneCarousel } from "./HeroSceneCarousel";

/** The hero images get swapped out (same filename, new bytes) periodically
 * as better artwork arrives. A file's mtime as a cache-busting `?v=`
 * query param means every real swap gets a new URL, so browsers that
 * cached the old `/_next/image?...` response can't keep serving it. This
 * runs server-side (PremiumAuthShell isn't a client component) so it
 * always reflects the file that's actually on disk right now. */
function assetVersion(publicRelativePath: string): number {
  try {
    return Math.round(statSync(path.join(process.cwd(), "public", publicRelativePath)).mtimeMs);
  } catch {
    return 0;
  }
}

interface PremiumAuthShellProps {
  kicker: string;
  heroTitle: string;
  heroSubtext: string;
  formTitle: string;
  formDescription: string;
  headerQuestion: string;
  headerCtaLabel: string;
  headerCtaHref: string;
  children: ReactNode;
}

/** Hero-scene login shell used by the login and register pages only — a
 * minimal split composition: a wide brand panel (logo, headline, a
 * full-bleed composed character scene) beside a card-based form.
 * Deliberately a separate component from AuthShell (which stays on
 * verify and the share-recipient flow) so this redesign can't touch
 * either of those.
 *
 * Fits the viewport with no page scroll (`h-dvh overflow-hidden`) — `dvh`
 * rather than `vh` so mobile browsers' collapsing address bar doesn't
 * leave a sliver cut off. Every size below `lg` is deliberately compact
 * (smaller type, tighter gaps, a short hero strip instead of a tall one)
 * because fitting a phone input, primary button, two social buttons, and
 * legal text in whatever's left after the hero and header, on the
 * shortest real phones (~650-700px tall), doesn't leave room for
 * generous spacing. None of this has been visually verified pixel-by-
 * pixel — it's sized from measuring each element's own rendered height,
 * not eyeballed. */
export function PremiumAuthShell({
  kicker,
  heroTitle,
  heroSubtext,
  formTitle,
  formDescription,
  headerQuestion,
  headerCtaLabel,
  headerCtaHref,
  children,
}: PremiumAuthShellProps) {
  const heroVersions: [number, number] = [
    assetVersion("characters/ui.png"),
    assetVersion("characters/ui1.png"),
  ];

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-[var(--color-bg)] lg:flex-row">
      <div
        className="relative flex h-[20vh] min-h-[104px] max-h-[200px] shrink-0 flex-col overflow-hidden bg-[var(--color-brand-hover)] px-5 py-3 sm:h-[28vh] sm:min-h-[190px] sm:max-h-[300px] sm:px-8 sm:py-6 lg:h-full lg:max-h-none lg:w-[64%] lg:px-14 lg:py-10 xl:px-16 2xl:max-w-[1500px]"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          paddingLeft: "max(1.25rem, env(safe-area-inset-left))",
        }}
      >
        <HeroSceneCarousel versions={heroVersions} />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-transparent"
        />

        <Link href="/" className="relative z-10 inline-flex w-fit items-center gap-2 focus-visible:outline-none sm:gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--color-brand-foreground)] sm:h-9 sm:w-9 sm:rounded-xl lg:h-10 lg:w-10">
            <span className="font-display text-sm font-bold text-[var(--color-brand-foreground)] sm:text-base lg:text-lg">
              H
            </span>
          </span>
          <span className="font-display text-base font-semibold tracking-tight text-[var(--color-brand-foreground)] sm:text-lg lg:text-xl">
            Healthy
          </span>
        </Link>

        <div className="relative z-10 mt-3 max-w-xl sm:mt-6 lg:mt-12">
          <p className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)] sm:block">
            {kicker}
          </p>
          <h1 className="font-display mt-0 text-[19px] font-medium leading-[1.15] tracking-tight text-[var(--color-brand-foreground)] sm:mt-2 sm:text-[28px] sm:leading-[1.12] lg:text-[46px] lg:leading-[1.08]">
            {heroTitle}
          </h1>
          <p className="mt-3 hidden max-w-md text-[15px] leading-relaxed text-[var(--color-brand-foreground)]/70 sm:block">
            {heroSubtext}
          </p>
        </div>

        <div className="flex-1" />

        <p className="font-script relative z-10 hidden text-xl leading-none text-[var(--color-brand-foreground)]/80 lg:block">
          A healthier tomorrow together ♡
        </p>
      </div>

      <div
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-3 sm:px-10 sm:py-5 lg:px-14 lg:py-10 xl:px-16"
        style={{
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          paddingRight: "max(1.25rem, env(safe-area-inset-right))",
        }}
      >
        {/* Header and footer are normal flow, not absolutely positioned —
           an earlier version centered the card against the whole panel via
           `absolute inset-0`, which let it overlap this header/footer on
           shorter viewports where the card is tall relative to the
           available height. Normal flow can't overlap: header and footer
           always keep their own space, and the card centers in whatever's
           left between them. */}
        <div className="flex items-center justify-end gap-3">
          <span className="hidden text-sm text-[var(--color-text-muted)] sm:inline">{headerQuestion}</span>
          <Link
            href={headerCtaHref}
            className="inline-flex min-h-9 items-center rounded-full border border-[var(--color-brand)] px-4 py-1.5 text-xs font-medium text-[var(--color-brand)] transition-colors hover:bg-[var(--color-brand)]/5 sm:min-h-11 sm:px-5 sm:py-2 sm:text-sm"
          >
            {headerCtaLabel}
          </Link>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center py-1 sm:py-6">
          <div className="max-h-full w-full max-w-[420px] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-lg)] sm:rounded-3xl sm:p-8 lg:p-10">
            <h2 className="font-display text-[20px] font-medium tracking-tight text-[var(--color-text)] sm:text-[26px] lg:text-[30px]">
              {formTitle}
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-[var(--color-text-muted)] sm:mt-2 sm:text-[15px] sm:leading-relaxed">
              {formDescription}
            </p>
            <div className="mt-4 sm:mt-7">{children}</div>
          </div>
        </div>

        <p className="font-script hidden text-center text-lg leading-tight text-[var(--color-text-muted)] lg:block">
          Healthier People
          <br />
          Happier Homes ♡
        </p>
      </div>
    </main>
  );
}
