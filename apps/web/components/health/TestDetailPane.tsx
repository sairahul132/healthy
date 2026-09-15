"use client";

import { useState } from "react";
import type { HealthCategory, TestTrend } from "@/lib/api/types";
import { computeTrend, toneFor } from "@/lib/health/status-engine";
import { getTestDescription } from "@/lib/health/test-descriptions";
import { formatDate } from "@/lib/utils/format";
import { CategoryIcon } from "@/components/health/CategoryIcon";
import { StatusPill, VisualRange } from "@/components/health/StatusVisuals";
import { TrendPanel } from "@/components/health/TrendPanel";
import { ExplainPanel } from "@/components/ai/ExplainPanel";
import { cn } from "@/lib/utils/cn";

function formatDelta(amount: number): string {
  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  return rounded.toString();
}

const TONE_TEXT: Record<string, string> = {
  success: "text-[var(--status-green)]",
  warning: "text-[var(--status-yellow)]",
  critical: "text-[var(--status-red)]",
  neutral: "text-[var(--status-neutral)]",
};

/** The master-detail Health page's right pane — the selected test's full
 * picture: current value (as of the test-history scrubber's position),
 * reference range, a plain-language "what this measures" note, the full
 * trend chart, an "Ask Healthy" explain toggle, and a recent-results
 * table with a change column. */
export function TestDetailPane({
  trend,
  category,
  viewingDate,
  onBack,
  className,
}: {
  trend: TestTrend | undefined;
  category: HealthCategory | undefined;
  viewingDate: string | null;
  onBack?: () => void;
  className?: string;
}) {
  const [askOpen, setAskOpen] = useState(false);

  if (!trend || !category) {
    return (
      <section className={cn("flex items-center justify-center p-10 text-center", className)}>
        <p className="text-sm text-[var(--color-text-faint)]">
          Select a test on the left to see its full history.
        </p>
      </section>
    );
  }

  const points = trend.points;
  let current = points.length > 0 ? points[0]! : null;
  let currentIndex = 0;
  for (let i = 0; i < points.length; i++) {
    const point = points[i]!;
    if (!viewingDate || !point.collectionDate || point.collectionDate <= viewingDate) {
      current = point;
      currentIndex = i;
    }
  }
  const previous = current && currentIndex > 0 ? points[currentIndex - 1]! : null;
  const trendResult = current && previous ? computeTrend(current.value, previous.value) : null;
  const recentPoints = [...points].reverse().slice(0, 6);

  return (
    <section className={cn("overflow-y-auto", className)}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-muted)] sm:hidden"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to tests
        </button>
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-[var(--color-text-faint)] uppercase">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-brand-tint)] text-[var(--color-brand)]">
              <CategoryIcon id={category.id} className="h-3.5 w-3.5" />
            </span>
            {category.label}
          </div>
          <h2 className="mt-2 font-display text-2xl font-medium text-[var(--color-text)]">
            {trend.canonicalTestName}
          </h2>
        </div>
        {current ? <StatusPill result={current} /> : null}
      </div>

      {current ? (
        <>
          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <p className="font-mono text-[38px] leading-none font-semibold text-[var(--color-text)]">
              {current.value}
              <span className="ml-2 font-sans text-sm font-medium text-[var(--color-text-faint)]">
                {current.unit}
              </span>
            </p>
            {trendResult && trendResult.direction !== "flat" ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-semibold",
                  trendResult.direction === "down"
                    ? "bg-[var(--status-green-tint)] text-[var(--status-green)]"
                    : "bg-[var(--status-yellow-tint)] text-[var(--status-yellow)]",
                )}
              >
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className={trendResult.direction === "up" ? "rotate-180" : ""}
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {formatDelta(trendResult.absoluteChange)} {trendResult.direction === "down" ? "lower" : "higher"} than
                last test
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            {viewingDate ? `Viewing as of ${formatDate(current.collectionDate)}` : `Last checked ${formatDate(current.collectionDate)}`}{" "}
            · {points.length} result{points.length === 1 ? "" : "s"} on file
          </p>

          <div className="mt-6 max-w-[540px]">
            <VisualRange
              result={{
                value: current.value,
                referenceLow: trend.referenceLow,
                referenceHigh: trend.referenceHigh,
                referenceText: trend.referenceText,
                status: current.status,
              }}
            />
          </div>

          <div className="mt-5 flex max-w-[540px] gap-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-accent-tint)] p-4">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="mt-0.5 shrink-0 text-[var(--color-accent)]"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 16v-5M12 8h.01" strokeLinecap="round" />
            </svg>
            <p className="text-[12.5px] leading-relaxed text-[var(--color-text-muted)]">
              <b className="font-semibold text-[var(--color-text)]">What this measures: </b>
              {getTestDescription(trend.canonicalCode, category.id)}
            </p>
          </div>

          <div className="mt-7 max-w-[780px]">
            <TrendPanel
              testName={trend.canonicalTestName}
              points={points}
              unit={trend.unit}
              referenceLow={trend.referenceLow}
              referenceHigh={trend.referenceHigh}
            />
            <button
              type="button"
              onClick={() => setAskOpen((v) => !v)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-brand)] px-4 py-2.5 text-[12.5px] font-semibold text-[var(--color-brand-foreground)] hover:opacity-90"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M21 11.5a8.4 8.4 0 01-8.5 8.4 8.5 8.5 0 01-4-1L3 20l1.1-5.5a8.4 8.4 0 1116.9-3Z" />
              </svg>
              {askOpen ? "Hide explanation" : "Ask Healthy about this result"}
            </button>
            {askOpen ? <ExplainPanel resultId={current.id} /> : null}
          </div>

          {recentPoints.length > 1 ? (
            <div className="mt-8 max-w-[620px] pb-2">
              <h3 className="font-display text-[15px] font-medium text-[var(--color-text)]">Recent results</h3>
              <table className="mt-2.5 w-full border-collapse">
                <thead>
                  <tr>
                    <th className="pb-2 text-left text-[10px] font-bold tracking-wide text-[var(--color-text-faint)] uppercase">
                      Date
                    </th>
                    <th className="pb-2 text-right text-[10px] font-bold tracking-wide text-[var(--color-text-faint)] uppercase">
                      Value
                    </th>
                    <th className="pb-2 text-right text-[10px] font-bold tracking-wide text-[var(--color-text-faint)] uppercase">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentPoints.map((point, i) => {
                    const priorPoint = recentPoints[i + 1];
                    const delta = priorPoint ? computeTrend(point.value, priorPoint.value) : null;
                    const rowTone = toneFor(point.status.direction);
                    return (
                      <tr key={point.id} className="border-t border-[var(--color-border)] first:border-t-0">
                        <td className="py-2.5 text-[13px] text-[var(--color-text)]">{formatDate(point.collectionDate)}</td>
                        <td
                          className={cn(
                            "py-2.5 text-right font-mono text-[13px] font-semibold",
                            TONE_TEXT[rowTone],
                          )}
                        >
                          {point.value} {point.unit}
                        </td>
                        <td className="py-2.5 text-right font-mono text-[13px]">
                          {delta ? (
                            <span
                              className={
                                delta.direction === "up"
                                  ? "text-[var(--status-red)]"
                                  : delta.direction === "down"
                                    ? "text-[var(--status-green)]"
                                    : "text-[var(--color-text-faint)]"
                              }
                            >
                              {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "—"}{" "}
                              {formatDelta(delta.absoluteChange)}
                            </span>
                          ) : (
                            <span className="text-[var(--color-text-faint)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-6 text-sm text-[var(--color-text-faint)]">No result recorded yet as of this date.</p>
      )}
    </section>
  );
}
