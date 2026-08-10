import type { ClinicalDirection, ClinicalSeverity, ClinicalStatus } from "@/lib/api/types";

export interface ReferenceRange {
  low: number | null;
  high: number | null;
}

export interface StatusThresholds {
  /** Fraction of the range width beyond low/high that counts as "borderline" (yellow) vs "significant" (orange). */
  borderlineBandFraction: number;
  /** Fraction of the range width beyond low/high that counts as critical (red). */
  criticalBandFraction: number;
}

export const DEFAULT_THRESHOLDS: StatusThresholds = {
  borderlineBandFraction: 0.1,
  criticalBandFraction: 0.5,
};

const LABELS: Record<ClinicalDirection, string> = {
  LOW: "Below range",
  NORMAL: "Within range",
  HIGH: "Above range",
  CRITICAL_LOW: "Critically low",
  CRITICAL_HIGH: "Critically high",
  UNKNOWN: "Reference range unavailable",
};

/**
 * Deterministic clinical status calculation — pure arithmetic against the
 * reference range printed on the patient's own report. No AI/LLM involved.
 *
 * This mirrors docs/SPEC.md §29/§30: red does not simply mean "low", some
 * tests are abnormal when high, so direction and severity are tracked
 * separately. The color is a UI aid only — never treat it as a diagnosis.
 */
export function computeClinicalStatus(
  value: number,
  range: ReferenceRange,
  thresholds: StatusThresholds = DEFAULT_THRESHOLDS,
): ClinicalStatus {
  const { low, high } = range;

  if (low === null && high === null) {
    return { direction: "UNKNOWN", severity: "yellow", label: LABELS.UNKNOWN };
  }

  if (low !== null && high !== null && low > high) {
    // Malformed reference range from extraction — never guess, surface it.
    return { direction: "UNKNOWN", severity: "yellow", label: LABELS.UNKNOWN };
  }

  const width = low !== null && high !== null ? high - low : null;

  if (low !== null && value < low) {
    const deficit = low - value;
    const bandWidth = width ?? (Math.abs(low) || 1);
    const isCritical = deficit >= bandWidth * thresholds.criticalBandFraction;
    const severity: ClinicalSeverity = isCritical
      ? "red"
      : deficit >= bandWidth * thresholds.borderlineBandFraction
        ? "orange"
        : "yellow";
    const direction: ClinicalDirection = isCritical ? "CRITICAL_LOW" : "LOW";
    return { direction, severity, label: isCritical ? LABELS.CRITICAL_LOW : LABELS.LOW };
  }

  if (high !== null && value > high) {
    const excess = value - high;
    const bandWidth = width ?? (Math.abs(high) || 1);
    const isCritical = excess >= bandWidth * thresholds.criticalBandFraction;
    const severity: ClinicalSeverity = isCritical
      ? "red"
      : excess >= bandWidth * thresholds.borderlineBandFraction
        ? "orange"
        : "yellow";
    const direction: ClinicalDirection = isCritical ? "CRITICAL_HIGH" : "HIGH";
    return { direction, severity, label: isCritical ? LABELS.CRITICAL_HIGH : LABELS.HIGH };
  }

  return { direction: "NORMAL", severity: "green", label: LABELS.NORMAL };
}

export interface TrendResult {
  absoluteChange: number;
  percentChange: number | null;
  direction: "up" | "down" | "flat";
}

export function computeTrend(current: number, previous: number | null): TrendResult | null {
  if (previous === null) return null;
  const absoluteChange = current - previous;
  const percentChange = previous !== 0 ? (absoluteChange / previous) * 100 : null;
  const direction = absoluteChange > 0 ? "up" : absoluteChange < 0 ? "down" : "flat";
  return { absoluteChange, percentChange, direction };
}
