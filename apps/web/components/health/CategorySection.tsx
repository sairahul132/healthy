"use client";

import { useState } from "react";
import type { HealthCategoryId, LabResult, TestTrend } from "@/lib/api/types";
import { useHealthCategoryDetail } from "@/lib/health/hooks";
import { formatDate } from "@/lib/utils/format";
import { LoadingState } from "@/components/ui/States";
import { CategoryIcon } from "@/components/health/CategoryIcon";
import { StatusPill, VisualRange } from "@/components/health/StatusVisuals";
import { TrendPanel } from "@/components/health/TrendPanel";

function latestDate(results: LabResult[]): string | null {
  return results.reduce<string | null>((latest, r) => {
    if (!r.collectionDate) return latest;
    if (!latest || r.collectionDate > latest) return r.collectionDate;
    return latest;
  }, null);
}

function ResultRow({ result, trend }: { result: LabResult; trend: TestTrend | undefined }) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = Boolean(trend && trend.points.length > 0);

  return (
    <div className="border-b border-[var(--color-border)] last:border-b-0">
      <div className="grid grid-cols-[1.6fr_1fr_1.6fr_0.9fr_0.9fr_auto] items-center gap-4 px-5 py-4 sm:px-6">
        <p className="font-display text-[14.5px] font-medium text-[var(--color-text)]">{result.canonicalTestName}</p>
        <p className="font-mono text-[15px] font-semibold text-[var(--color-text)]">
          {result.value}
          <span className="font-sans ml-1 text-[11px] font-medium text-[var(--color-text-faint)]">{result.unit}</span>
        </p>
        <VisualRange result={result} />
        <StatusPill result={result} />
        <p className="text-xs text-[var(--color-text-faint)]">{formatDate(result.collectionDate)}</p>
        <button
          type="button"
          disabled={!canExpand}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Hide" : "Show"} trend for ${result.canonicalTestName}`}
          className={
            expanded
              ? "flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-[var(--color-accent-bright)]"
              : "flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] disabled:cursor-not-allowed disabled:opacity-40"
          }
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 19h16M7 19V9M12 19V5M17 19v-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {expanded && trend ? (
        <div className="px-5 pb-5 sm:px-6">
          <TrendPanel
            testName={result.canonicalTestName}
            points={trend.points}
            unit={trend.unit}
            referenceLow={result.referenceLow}
            referenceHigh={result.referenceHigh}
          />
        </div>
      ) : null}
    </div>
  );
}

export function CategorySection({
  categoryId,
  label,
  trends,
}: {
  categoryId: HealthCategoryId;
  label: string;
  trends: TestTrend[];
}) {
  const { data: category, isLoading } = useHealthCategoryDetail(categoryId);

  if (isLoading) return <LoadingState label={`Loading ${label}…`} />;
  if (!category || category.latestResults.length === 0) return null;

  const results = [...category.latestResults].sort((a, b) => a.canonicalTestName.localeCompare(b.canonicalTestName));

  return (
    <section className="mb-2">
      <div className="mb-3 mt-8 flex items-center gap-3 first:mt-0">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-brand-tint)] text-[var(--color-brand)]">
          <CategoryIcon id={categoryId} className="h-4 w-4" />
        </span>
        <h2 className="font-display text-[17px] font-medium text-[var(--color-text)]">{label}</h2>
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--color-border-strong)]" />
        <span className="text-xs text-[var(--color-text-faint)]">
          {results.length} {results.length === 1 ? "test" : "tests"}
          {(() => {
            const date = latestDate(results);
            return date ? ` · updated ${formatDate(date)}` : "";
          })()}
        </span>
      </div>
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        {results.map((result) => (
          <ResultRow
            key={result.id}
            result={result}
            trend={trends.find((t) => t.canonicalTestName === result.canonicalTestName)}
          />
        ))}
      </div>
    </section>
  );
}
