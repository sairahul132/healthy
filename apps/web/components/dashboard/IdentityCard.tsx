import { Logomark } from "@/components/layout/Logo";
import { cn } from "@/lib/utils/cn";

export function IdentityCard({
  healthyId,
  name,
  attentionCount,
  outsideRangeOpen,
  onToggleOutsideRange,
}: {
  healthyId: string;
  name: string | null;
  attentionCount: number;
  outsideRangeOpen?: boolean;
  onToggleOutsideRange?: () => void;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 shadow-lg sm:p-7"
      style={{
        background:
          "linear-gradient(135deg, var(--color-brand) 0%, var(--color-brand-hover) 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)" }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="mb-5 flex items-center gap-2">
            <Logomark className="h-6 w-6" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-brand-foreground)]/70">
              Health Vault
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-accent)]/30 px-2 py-0.5 text-[9.5px] font-semibold tracking-wide text-[var(--color-accent)] uppercase">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <rect x="4" y="10" width="16" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
              </svg>
              Encrypted
            </span>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-accent-bright)]/80">
            Healthy ID
          </p>
          <p className="font-display mt-1 text-2xl font-medium tracking-wide text-[var(--color-accent-bright)]">
            {healthyId}
          </p>
          {name ? (
            <p className="mt-1 text-sm text-[var(--color-brand-foreground)]/75">{name}</p>
          ) : null}
        </div>

        {attentionCount > 0 ? (
          <button
            type="button"
            onClick={onToggleOutsideRange}
            aria-expanded={outsideRangeOpen}
            className="flex shrink-0 flex-col items-center gap-0.5 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-[var(--color-accent-foreground)] shadow-sm transition-opacity hover:opacity-90"
          >
            <p className="text-lg leading-none font-semibold">{attentionCount}</p>
            <p className="flex items-center gap-1 text-[9.5px] leading-none font-medium whitespace-nowrap uppercase">
              Outside range
              <svg
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className={cn("shrink-0 transition-transform", outsideRangeOpen && "rotate-180")}
              >
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </p>
          </button>
        ) : null}
      </div>
    </div>
  );
}
