import { Logomark } from "@/components/layout/Logo";

export function IdentityCard({
  healthyId,
  name,
  attentionCount,
}: {
  healthyId: string;
  name: string | null;
  attentionCount: number;
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
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-brand-foreground)]/60">
            Healthy ID
          </p>
          <p className="font-display mt-1 text-2xl font-medium tracking-wide text-[var(--color-brand-foreground)]">
            {healthyId}
          </p>
          {name ? (
            <p className="mt-1 text-sm text-[var(--color-brand-foreground)]/75">{name}</p>
          ) : null}
        </div>

        {attentionCount > 0 ? (
          <div className="shrink-0 rounded-xl bg-[var(--color-accent)] px-3 py-2 text-right text-[var(--color-accent-foreground)] shadow-sm">
            <p className="text-lg font-semibold leading-none">{attentionCount}</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wide leading-none">
              Outside range
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
