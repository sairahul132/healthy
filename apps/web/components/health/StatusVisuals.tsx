import type { LabResult } from "@/lib/api/types";
import { toneFor, type Tone } from "@/lib/health/status-engine";
import { cn } from "@/lib/utils/cn";

export const TONE_PILL: Record<Tone, string> = {
  success: "bg-[var(--status-green-tint)] text-[var(--status-green)]",
  warning: "bg-[var(--status-yellow-tint)] text-[var(--status-yellow)]",
  critical: "bg-[var(--status-red-tint)] text-[var(--status-red)]",
  neutral: "bg-[var(--status-neutral-tint)] text-[var(--status-neutral)]",
};

const TONE_TRACK: Record<Tone, string> = {
  success: "bg-[var(--status-green-tint)]",
  warning: "bg-[var(--status-yellow-tint)]",
  critical: "bg-[var(--status-red-tint)]",
  neutral: "bg-[var(--status-neutral-tint)]",
};

const TONE_DOT: Record<Tone, string> = {
  success: "bg-[var(--status-green)]",
  warning: "bg-[var(--status-yellow)]",
  critical: "bg-[var(--status-red)]",
  neutral: "bg-[var(--status-neutral)]",
};

export function StatusPill({ result }: { result: LabResult }) {
  const tone = toneFor(result.status.direction);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        TONE_PILL[tone],
      )}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {result.status.label}
    </span>
  );
}

/** A thin reference-range track with the value plotted on it — used on
 * both the report detail table and the Health page's result rows. Falls
 * back to the raw reference text when there's no numeric low/high to plot
 * against (e.g. a qualitative test). */
export function VisualRange({ result }: { result: LabResult }) {
  const { referenceLow: low, referenceHigh: high, value } = result;
  if (low === null || high === null || low >= high) {
    return <p className="text-xs text-[var(--color-text-faint)]">{result.referenceText || "No reference range"}</p>;
  }
  const rawPct = ((value - low) / (high - low)) * 100;
  const pct = Math.min(Math.max(rawPct, -12), 112);
  const tone = toneFor(result.status.direction);

  return (
    <div className="w-full min-w-[150px]">
      <div className={cn("relative mt-4.5 h-px rounded-full", TONE_TRACK[tone])}>
        <span
          className="absolute -top-4 -translate-x-1/2 text-[10.5px] font-bold text-[var(--color-text)] tabular-nums"
          style={{ left: `${pct}%` }}
        >
          {value}
        </span>
        <span
          className={cn(
            "absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--color-surface)] shadow-sm",
            TONE_DOT[tone],
          )}
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-[var(--color-text-faint)] tabular-nums">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
