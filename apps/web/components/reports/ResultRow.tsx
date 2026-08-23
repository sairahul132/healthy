import { useState } from "react";
import type { LabResult } from "@/lib/api/types";
import { computeTrend } from "@/lib/health/status-engine";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ExplainPanel } from "@/components/ai/ExplainPanel";

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

export function ResultRow({
  result,
  allowExplain = true,
}: {
  result: LabResult;
  /** "Explain this" calls the patient's own AI assistant (patient-session
   * authenticated) — hide it wherever ResultRow renders for a viewer who
   * isn't the patient (e.g. a share recipient), since the request would
   * just 401. */
  allowExplain?: boolean;
}) {
  const [showExplain, setShowExplain] = useState(false);

  return (
    <div className="border-b border-[var(--color-border)] py-4 last:border-b-0">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4">
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
        <div className="flex items-center justify-self-start gap-2 sm:justify-self-end">
          <StatusBadge severity={result.status.severity} label={result.status.label} />
          {allowExplain ? (
            <Button variant="ghost" size="sm" onClick={() => setShowExplain((v) => !v)}>
              {showExplain ? "Hide" : "Explain"}
            </Button>
          ) : null}
        </div>
      </div>
      {allowExplain && showExplain ? <ExplainPanel resultId={result.id} /> : null}
    </div>
  );
}
