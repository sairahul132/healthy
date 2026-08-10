import type { LabResult } from "@/lib/api/types";
import { computeTrend } from "@/lib/health/status-engine";
import { StatusBadge } from "@/components/ui/StatusBadge";

function TrendIndicator({ result }: { result: LabResult }) {
  const trend = computeTrend(result.value, result.previousValue);
  if (!trend) {
    return <span className="text-xs text-[var(--color-text-faint)]">No previous result</span>;
  }

  const arrow = trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→";
  const label =
    trend.direction === "flat"
      ? "No change"
      : `${arrow} ${trend.direction === "up" ? "Increased" : "Decreased"} from ${result.previousValue}`;

  return (
    <span className="text-xs text-[var(--color-text-muted)]">
      {label}
      {trend.percentChange !== null ? ` (${Math.abs(trend.percentChange).toFixed(1)}%)` : ""}
    </span>
  );
}

export function ResultRow({ result }: { result: LabResult }) {
  return (
    <div className="grid grid-cols-1 gap-2 border-b border-[var(--color-border)] py-4 last:border-b-0 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4">
      <div>
        <p className="text-sm font-medium text-[var(--color-text)]">{result.testName}</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Reference: {result.referenceText}
          {result.extractionConfidence < 0.95 ? (
            <span className="ml-2 text-[var(--status-yellow)]">Please verify this value</span>
          ) : null}
        </p>
        <div className="mt-1">
          <TrendIndicator result={result} />
        </div>
      </div>
      <div className="text-right sm:text-left">
        <p className="text-sm font-semibold text-[var(--color-text)]">
          {result.value} <span className="font-normal text-[var(--color-text-muted)]">{result.unit}</span>
        </p>
      </div>
      <div className="justify-self-start sm:justify-self-end">
        <StatusBadge severity={result.status.severity} label={result.status.label} />
      </div>
    </div>
  );
}
