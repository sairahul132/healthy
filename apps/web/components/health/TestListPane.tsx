"use client";

import { useMemo, useState } from "react";
import type { HealthCategory, TestTrend } from "@/lib/api/types";
import { toneFor } from "@/lib/health/status-engine";
import { latestPointAsOf } from "@/lib/health/as-of";
import type { HealthStatusFilter } from "@/lib/health/status-filter";
import { CategoryIcon } from "@/components/health/CategoryIcon";
import { cn } from "@/lib/utils/cn";

const TONE_DOT: Record<string, string> = {
  success: "bg-[var(--status-green)]",
  warning: "bg-[var(--status-yellow)]",
  critical: "bg-[var(--status-red)]",
  neutral: "bg-[var(--status-neutral)]",
};

/** The master-detail Health page's left rail — every test, one line each,
 * grouped by body system. Selecting a row drives what the detail pane on
 * the right shows; a value shown here reflects `viewingDate` (the test
 * history scrubber), not necessarily the very latest report. */
export function TestListPane({
  categories,
  trends,
  selectedCode,
  onSelect,
  viewingDate,
  statusFilter = "all",
  className,
}: {
  categories: HealthCategory[];
  trends: TestTrend[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
  viewingDate: string | null;
  statusFilter?: HealthStatusFilter;
  className?: string;
}) {
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    const query = search.trim().toLowerCase();
    let matching = query
      ? trends.filter((t) => t.canonicalTestName.toLowerCase().includes(query))
      : trends;
    if (statusFilter !== "all") {
      matching = matching.filter((t) => {
        const direction = latestPointAsOf(t.points, viewingDate)?.status.direction;
        const isOk = direction === "NORMAL";
        return statusFilter === "ok" ? isOk : direction !== undefined && !isOk;
      });
    }
    const byCategory = new Map<string, TestTrend[]>();
    for (const trend of matching) {
      const list = byCategory.get(trend.category) ?? [];
      list.push(trend);
      byCategory.set(trend.category, list);
    }
    for (const list of byCategory.values()) {
      list.sort((a, b) => a.canonicalTestName.localeCompare(b.canonicalTestName));
    }
    return categories
      .filter((c) => byCategory.has(c.id))
      .map((c) => ({ category: c, tests: byCategory.get(c.id)! }));
  }, [categories, trends, search, statusFilter, viewingDate]);

  return (
    <aside className={cn("overflow-y-auto", className)}>
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0 text-[var(--color-text-faint)]"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter tests…"
            aria-label="Filter tests"
            className="w-full bg-transparent text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none"
          />
        </div>
      </div>

      {grouped.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-[var(--color-text-faint)]">
          {search
            ? <>No tests match &ldquo;{search}&rdquo;.</>
            : statusFilter === "ok"
              ? "No tests are within range yet."
              : statusFilter === "attn"
                ? "Nothing needs attention right now."
                : "No tests to show."}
        </p>
      ) : (
        grouped.map(({ category, tests }) => (
          <div key={category.id}>
            <p className="flex items-center gap-1.5 px-4 pt-3.5 pb-1.5 text-[10.5px] font-bold tracking-wide text-[var(--color-text-faint)] uppercase">
              <CategoryIcon id={category.id} className="h-3 w-3 text-[var(--color-accent)]" />
              {category.label}
              <span className="ml-auto font-mono text-[11px] font-medium normal-case tracking-normal">
                {tests.length}
              </span>
            </p>
            {tests.map((trend) => {
              const point = latestPointAsOf(trend.points, viewingDate);
              const tone = point ? toneFor(point.status.direction) : "neutral";
              const active = selectedCode === trend.canonicalCode;
              return (
                <button
                  key={trend.canonicalCode}
                  type="button"
                  onClick={() => onSelect(trend.canonicalCode)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2.5 rounded-r-xl border-l-[3px] px-4 py-2.5 text-left transition-colors",
                    active
                      ? "border-[var(--color-accent)] bg-[var(--color-surface)] shadow-[inset_0_0_0_1px_var(--color-border)]"
                      : "border-transparent hover:bg-[var(--color-surface)]/70",
                  )}
                >
                  <span className="truncate text-[13px] font-medium text-[var(--color-text)]">
                    {trend.canonicalTestName}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-xs text-[var(--color-text-muted)]">
                      {point ? point.value : "—"}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[tone])}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        ))
      )}
    </aside>
  );
}
