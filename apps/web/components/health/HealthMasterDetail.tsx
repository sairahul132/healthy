"use client";

import { useMemo, useState } from "react";
import type { HealthCategoryId } from "@/lib/api/types";
import { useHealthCategories, useHealthTrends } from "@/lib/health/hooks";
import { useReports } from "@/lib/reports/hooks";
import { latestPointAsOf } from "@/lib/health/as-of";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { TestListPane } from "@/components/health/TestListPane";
import { TestDetailPane } from "@/components/health/TestDetailPane";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/** design/health-page-mockup-v3-soft.html, implemented — a master-detail
 * Health page: every test browsable on the left, the selected one's full
 * picture (value, range, trend, explainer, recent results) on the right,
 * with a "your test history" scrubber that lets you see what a test showed
 * as of any past report. Uses the app's usual theme (same as the sidebar
 * and every other page) rather than the mockup's own indigo/rose palette.
 *
 * `initialCategoryId` seeds the selection from the `/health/[id]` deep link
 * (e.g. a report's category chip) by picking that category's first test. */
export function HealthMasterDetail({ initialCategoryId }: { initialCategoryId?: HealthCategoryId }) {
  const { data: categories, isLoading: categoriesLoading, isError, refetch } = useHealthCategories();
  const { data: trends, isLoading: trendsLoading } = useHealthTrends();
  const { data: reports } = useReports();

  const sortedTrends = useMemo(
    () => [...(trends ?? [])].sort((a, b) => a.canonicalTestName.localeCompare(b.canonicalTestName)),
    [trends],
  );

  const reportDates = useMemo(() => {
    const dates = new Set<string>();
    for (const report of reports ?? []) {
      if (report.status === "COMPLETED" && report.collectionDate) dates.add(report.collectionDate);
    }
    return Array.from(dates).sort();
  }, [reports]);

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [viewingDate, setViewingDate] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<"list" | "detail">("list");
  const [statusFilter, setStatusFilter] = useState<"all" | "ok" | "attn">("all");

  const effectiveSelectedCode = useMemo(() => {
    if (selectedCode && sortedTrends.some((t) => t.canonicalCode === selectedCode)) return selectedCode;
    const scoped = initialCategoryId
      ? sortedTrends.find((t) => t.category === initialCategoryId)
      : undefined;
    return (scoped ?? sortedTrends[0])?.canonicalCode ?? null;
  }, [selectedCode, sortedTrends, initialCategoryId]);

  const selectedTrend = sortedTrends.find((t) => t.canonicalCode === effectiveSelectedCode);
  const selectedCategory = categories?.find((c) => c.id === selectedTrend?.category);
  const effectiveViewingDate = viewingDate ?? reportDates.at(-1) ?? null;

  const lastReport = useMemo(() => {
    const completed = (reports ?? []).filter((r) => r.status === "COMPLETED");
    return [...completed].sort((a, b) => (b.collectionDate ?? "").localeCompare(a.collectionDate ?? ""))[0];
  }, [reports]);

  if (categoriesLoading || trendsLoading) return <LoadingState label="Loading your health categories…" />;
  if (isError) {
    return (
      <ErrorState
        description="We couldn't load your health categories."
        action={
          <Button size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }
  if (!categories || categories.length === 0) {
    return (
      <EmptyState
        title="Nothing here yet"
        description="Upload a report to see your results organized by body system."
      />
    );
  }

  const totalTests = sortedTrends.length;
  const latestDirections = sortedTrends.map(
    (t) => latestPointAsOf(t.points, effectiveViewingDate)?.status.direction,
  );
  const inRangeCount = latestDirections.filter((d) => d === "NORMAL").length;
  const attentionCount = latestDirections.filter(
    (d) => d === "HIGH" || d === "LOW" || d === "CRITICAL_HIGH" || d === "CRITICAL_LOW",
  ).length;

  function selectTest(code: string) {
    setSelectedCode(code);
    setMobilePane("detail");
  }

  return (
    <div>
      <span className="text-[11px] font-bold tracking-[0.16em] text-[var(--color-accent)] uppercase">
        Your results, organized
      </span>
      <h1 className="mt-1.5 font-display text-[28px] font-medium text-[var(--color-text)]">Health</h1>
      <p className="mt-1 text-[13.5px] text-[var(--color-text-muted)]">
        Browse every test on the left — the panel on the right always shows its full picture.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          n={totalTests}
          l="Total tests"
          s={`Across ${categories.length} categories`}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <StatTile
          n={inRangeCount}
          l="Within range"
          s={`${totalTests ? Math.round((inRangeCount / totalTests) * 100) : 0}% of results`}
          tone="ok"
          active={statusFilter === "ok"}
          onClick={() => setStatusFilter((f) => (f === "ok" ? "all" : "ok"))}
        />
        <StatTile
          n={attentionCount}
          l="Need attention"
          s={`${totalTests ? Math.round((attentionCount / totalTests) * 100) : 0}% of results`}
          tone="attn"
          active={statusFilter === "attn"}
          onClick={() => setStatusFilter((f) => (f === "attn" ? "all" : "attn"))}
        />
        <StatTile
          n={lastReport ? formatDate(lastReport.collectionDate) : "—"}
          l="Last updated"
          s={lastReport?.fileName ?? "No reports yet"}
        />
      </div>

      {reportDates.length > 1 ? (
        <div className="mt-4 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4 shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-[15px] font-medium text-[var(--color-text)]">Your test history</h2>
            <span className="text-[11px] text-[var(--color-text-faint)]">
              Select a report date to see the panel as of that day
            </span>
          </div>
          <div className="relative mx-2 mt-4 h-[3px] rounded-full bg-[var(--color-surface-muted)]">
            {reportDates.map((date, index) => {
              const selected = date === effectiveViewingDate;
              const left = reportDates.length === 1 ? 0 : (index / (reportDates.length - 1)) * 100;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setViewingDate(date)}
                  aria-label={`View as of ${formatDate(date)}`}
                  aria-pressed={selected}
                  className={cn(
                    "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-[var(--color-surface)] transition-all",
                    selected
                      ? "h-4 w-4 bg-[var(--color-accent)] shadow-[0_0_0_5px_var(--color-accent-tint)]"
                      : "h-3 w-3 bg-[var(--color-border-strong)] hover:bg-[var(--color-accent)]",
                  )}
                  style={{ left: `${left}%` }}
                />
              );
            })}
          </div>
          <div className="relative mx-2 mt-3 h-4">
            {reportDates.map((date, index) => {
              const selected = date === effectiveViewingDate;
              const isEdge = index === 0 || index === reportDates.length - 1;
              if (reportDates.length > 6 && !selected && !isEdge) return null;
              const left = reportDates.length === 1 ? 0 : (index / (reportDates.length - 1)) * 100;
              return (
                <span
                  key={date}
                  className={cn(
                    "absolute -translate-x-1/2 font-mono text-[10.5px] whitespace-nowrap",
                    selected ? "font-bold text-[var(--color-accent)]" : "text-[var(--color-text-faint)]",
                  )}
                  style={{ left: `${left}%` }}
                >
                  {formatDate(date)}
                  {selected ? " (viewing)" : ""}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex min-h-[560px] overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
        <TestListPane
          categories={categories}
          trends={sortedTrends}
          selectedCode={effectiveSelectedCode}
          onSelect={selectTest}
          viewingDate={effectiveViewingDate}
          statusFilter={statusFilter}
          className={cn(
            "w-full shrink-0 border-[var(--color-border)] bg-[var(--color-surface-muted)] sm:block sm:w-[300px] sm:border-r",
            mobilePane === "detail" ? "hidden" : "block",
          )}
        />
        <TestDetailPane
          trend={selectedTrend}
          category={selectedCategory}
          viewingDate={effectiveViewingDate}
          onBack={() => setMobilePane("list")}
          className={cn(
            "min-w-0 flex-1 p-5 sm:block sm:p-9",
            mobilePane === "list" ? "hidden" : "block",
          )}
        />
      </div>
    </div>
  );
}

function StatTile({
  n,
  l,
  s,
  tone,
  active,
  onClick,
}: {
  n: number | string;
  l: string;
  s: string;
  tone?: "ok" | "attn";
  active?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={cn(
        "rounded-[14px] border p-4 text-left transition-shadow",
        tone === "attn" ? "border-transparent bg-[var(--status-yellow-tint)]" : "border-[var(--color-border)] bg-[var(--color-surface)]",
        onClick && "cursor-pointer hover:shadow-[var(--shadow-sm)]",
        active && onClick ? "ring-2 ring-[var(--color-accent)] ring-offset-1 ring-offset-[var(--color-bg)]" : "",
      )}
    >
      <p
        className={cn(
          "font-display text-2xl leading-none font-semibold",
          tone === "ok" ? "text-[var(--status-green)]" : tone === "attn" ? "text-[var(--status-yellow)]" : "text-[var(--color-text)]",
        )}
      >
        {n}
      </p>
      <p
        className={cn(
          "mt-1.5 text-[11.5px] font-semibold",
          tone === "ok" ? "text-[var(--status-green)]" : tone === "attn" ? "text-[var(--status-yellow)]" : "text-[var(--color-text)]",
        )}
      >
        {l}
      </p>
      <p className="mt-0.5 truncate text-[10.5px] text-[var(--color-text-muted)]">{s}</p>
    </Tag>
  );
}
