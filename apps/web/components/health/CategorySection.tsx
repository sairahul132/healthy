"use client";

import { useState } from "react";
import type { HealthCategoryId, LabResult, TestTrend } from "@/lib/api/types";
import { useHealthCategoryDetail } from "@/lib/health/hooks";
import { formatDate } from "@/lib/utils/format";
import { LoadingState } from "@/components/ui/States";
import { CategoryIcon } from "@/components/health/CategoryIcon";
import { StatusPill, VisualRange } from "@/components/health/StatusVisuals";
import { TrendPanel } from "@/components/health/TrendPanel";
import { cn } from "@/lib/utils/cn";

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

  const name = (
    <p className="font-display text-[14.5px] font-medium text-[var(--color-text)]">
      {result.canonicalTestName}
    </p>
  );
  const value = (
    <p className="font-mono text-[15px] font-semibold text-[var(--color-text)] whitespace-nowrap">
      {result.value}
      <span className="font-sans ml-1 text-[11px] font-medium text-[var(--color-text-faint)]">{result.unit}</span>
    </p>
  );
  const date = (
    <p className="text-xs text-[var(--color-text-faint)] whitespace-nowrap">
      {formatDate(result.collectionDate)}
    </p>
  );
  const expandButton = (
    <button
      type="button"
      disabled={!canExpand}
      onClick={() => setExpanded((v) => !v)}
      aria-expanded={expanded}
      aria-label={`${expanded ? "Hide" : "Show"} trend for ${result.canonicalTestName}`}
      className={cn(
        "flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full",
        expanded
          ? "bg-[var(--color-brand)] text-[var(--color-accent-bright)]"
          : "border border-[var(--color-border)] text-[var(--color-text-muted)] disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 19h16M7 19V9M12 19V5M17 19v-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  return (
    <div className="border-b border-[var(--color-border)] last:border-b-0">
      {/* Mobile: stacked. Kept as a fully separate layout from the desktop
          row below (rather than one grid reflowed via `display:contents`)
          because Safari doesn't place grid items correctly when their
          parent has `display:contents` — this is the reliable version. */}
      <div className="flex flex-col gap-3 px-5 py-4 sm:hidden">
        <div className="flex items-start justify-between gap-3">
          {name}
          {expandButton}
        </div>
        <div className="flex items-center justify-between gap-3">
          {value}
          <StatusPill result={result} />
        </div>
        <VisualRange result={result} />
        {date}
      </div>

      {/* Desktop: one row, plain grid, no contents trick. Column ratios and
          spacing match design/health-page-mockup.html's .result-row. */}
      <div className="hidden sm:grid sm:grid-cols-[1.5fr_1fr_1.6fr_0.9fr_0.9fr_44px] sm:items-center sm:gap-[18px] sm:px-[22px] sm:py-4">
        {name}
        {value}
        <VisualRange result={result} />
        <StatusPill result={result} />
        {date}
        {expandButton}
      </div>

      {expanded && trend ? (
        <div className="px-5 pb-5 sm:px-[22px] sm:pb-[18px]">
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
      <div className="mb-3 mt-[30px] flex flex-wrap items-center gap-x-3 gap-y-1 first:mt-0">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-brand-tint)] text-[var(--color-brand)]">
          <CategoryIcon id={categoryId} className="h-4 w-4" />
        </span>
        <h2 className="font-display text-[17px] font-medium text-[var(--color-text)]">{label}</h2>
        <span aria-hidden="true" className="hidden h-px min-w-4 flex-1 bg-[var(--color-border-strong)] sm:block" />
        <span className="text-xs text-[var(--color-text-faint)]">
          {results.length} {results.length === 1 ? "test" : "tests"}
          {(() => {
            const date = latestDate(results);
            return date ? ` · updated ${formatDate(date)}` : "";
          })()}
        </span>
      </div>
      <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)]">
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
