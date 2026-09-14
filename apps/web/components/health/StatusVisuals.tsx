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
        "inline-flex items-center gap-[5px] rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap",
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
  // Marker (dot) can sit slightly outside the track to show an out-of-range
  // value — but its value label is clamped tighter so the label text itself
  // never overhangs the track's own width and clips against the row next
  // to it or the min/max labels below.
  const dotPct = Math.min(Math.max(rawPct, -12), 112);
  const labelPct = Math.min(Math.max(rawPct, 6), 94);
  const tone = toneFor(result.status.direction);

  return (
    <div className="w-full min-w-0">
      <div className={cn("relative mt-4 h-px rounded-full", TONE_TRACK[tone])}>
        <span
          className="absolute -top-[18px] -translate-x-1/2 text-[10.5px] font-bold text-nowrap text-[var(--color-text)] tabular-nums"
          style={{ left: `${labelPct}%` }}
        >
          {value}
        </span>
        <span
          className={cn(
            "absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--color-surface)] shadow-sm",
            TONE_DOT[tone],
          )}
          style={{ left: `${dotPct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-[var(--color-text-faint)] tabular-nums">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
