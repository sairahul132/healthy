"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClinicalDirection, HealthCategoryId, LabResult } from "@/lib/api/types";
import { ApiError } from "@/lib/api/types";
import { useDeleteReport, useDownloadReportFile, useReport, useReportResults } from "@/lib/reports/hooks";
import { useCompareReport } from "@/lib/ai/hooks";
import { attentionRank, computeTrend, toneFor, type Tone } from "@/lib/health/status-engine";
import { getCategory } from "@/lib/health/categories";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { ExplainPanel } from "@/components/ai/ExplainPanel";
import { CategoryIcon } from "@/components/health/CategoryIcon";
import { StatusPill, TONE_PILL, VisualRange } from "@/components/health/StatusVisuals";
import { ShareReportDialog } from "@/components/sharing/ShareReportDialog";
import { ReportToolbar, type SortBy, type StatusFilter } from "@/components/reports/ReportToolbar";

function ResultsTable({ results }: { results: LabResult[] }) {
  const [explainingId, setExplainingId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr>
            {["Test Name", "Result", "Reference Range", "Visual Range", "Status", "Previous", "Action"].map(
              (heading) => (
                <th
                  key={heading}
                  className="border-b border-[var(--color-border)] px-5 py-3 text-left text-[11px] font-semibold tracking-wide text-[var(--color-text-faint)] uppercase whitespace-nowrap"
                >
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {results.map((result) => {
            const trend = computeTrend(result.value, result.previousValue);
            return (
              <Fragment key={result.id}>
                <tr className="border-b border-[var(--color-border)] last:border-b-0">
                  <td className="px-5 py-4 align-middle">
                    <p className="text-sm font-semibold text-[var(--color-text)]">{result.testName}</p>
                    {result.canonicalTestName !== result.testName ? (
                      <p className="mt-0.5 text-[11px] text-[var(--color-text-faint)]">
                        {result.canonicalTestName}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 align-middle text-sm font-semibold whitespace-nowrap text-[var(--color-text)] tabular-nums">
                    {result.value} {result.unit}
                  </td>
                  <td className="px-5 py-4 align-middle text-sm whitespace-nowrap text-[var(--color-text-muted)] tabular-nums">
                    {result.referenceLow !== null && result.referenceHigh !== null
                      ? `${result.referenceLow} – ${result.referenceHigh} ${result.unit}`
                      : result.referenceText || "—"}
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <VisualRange result={result} />
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <StatusPill result={result} />
                  </td>
                  <td className="px-5 py-4 align-middle text-xs text-[var(--color-text-faint)]">
                    {trend
                      ? `${result.previousValue} ${result.unit} (${trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"})`
                      : "No previous result"}
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <button
                      type="button"
                      onClick={() => setExplainingId(explainingId === result.id ? null : result.id)}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-accent)] hover:gap-1.5"
                    >
                      {explainingId === result.id ? "Hide" : "Explain"}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </button>
                  </td>
                </tr>
                {explainingId === result.id ? (
                  <tr>
                    <td colSpan={7} className="bg-[var(--color-surface-muted)] px-5 py-3">
                      <ExplainPanel resultId={result.id} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ResultGroup({
  categoryId,
  results,
  defaultOpen,
}: {
  categoryId: HealthCategoryId;
  results: LabResult[];
  defaultOpen: boolean;
}) {
  const category = getCategory(categoryId);
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[var(--color-surface-muted)] px-5.5 py-4">
        <span className="flex items-center gap-2.5 text-[15px] font-semibold text-[var(--color-text)]">
          <CategoryIcon id={categoryId} className="text-[var(--color-accent)]" />
          {category.label}
          <span className="font-normal text-[var(--color-text-faint)]">({results.length})</span>
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="shrink-0 text-[var(--color-text-faint)] transition-transform group-open:rotate-180"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <ResultsTable results={results} />
    </details>
  );
}

function CompareWithPreviousReport({ reportId }: { reportId: string }) {
  const compare = useCompareReport();
  const [noPrevious, setNoPrevious] = useState(false);

  if (compare.isSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compared to previous report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-[var(--color-text)]">{compare.data.narrative}</p>
        </CardContent>
      </Card>
    );
  }

  if (noPrevious) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        This is your earliest report for these tests — nothing to compare yet.
      </p>
    );
  }

  return (
    <div>
      <Button
        variant="secondary"
        size="sm"
        isLoading={compare.isPending}
        onClick={() =>
          compare.mutate(
            { reportId },
            {
              onError: (err) => {
                if (err instanceof ApiError && err.status === 404) setNoPrevious(true);
              },
            },
          )
        }
      >
        Compare with previous report
      </Button>
      {compare.isError && !noPrevious ? (
        <p className="mt-2 text-xs text-[var(--color-danger)]">Couldn&apos;t generate a comparison.</p>
      ) : null}
    </div>
  );
}

const ATTENTION_DIRECTIONS: ClinicalDirection[] = ["CRITICAL_HIGH", "CRITICAL_LOW", "HIGH", "LOW"];

export function ReportDetail({ reportId }: { reportId: string }) {
  const router = useRouter();
  const { data: report, isLoading, isError } = useReport(reportId);
  const { data: results } = useReportResults(reportId, report?.status === "COMPLETED");
  const downloadMutation = useDownloadReportFile();
  const deleteMutation = useDeleteReport();

  const [selectedCategories, setSelectedCategories] = useState<HealthCategoryId[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("category");
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const categoryCounts = useMemo(() => {
    const counts = new Map<HealthCategoryId, number>();
    for (const result of results ?? []) {
      counts.set(result.category, (counts.get(result.category) ?? 0) + 1);
    }
    return counts;
  }, [results]);

  const filteredResults = useMemo(() => {
    if (!results) return [];
    return results.filter((r) => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(r.category)) return false;
      if (statusFilter === "in_range" && r.status.direction !== "NORMAL") return false;
      if (statusFilter === "attention" && !ATTENTION_DIRECTIONS.includes(r.status.direction)) return false;
      if (statusFilter === "not_available" && r.status.direction !== "UNKNOWN") return false;
      return true;
    });
  }, [results, selectedCategories, statusFilter]);

  const sortedFlatResults = useMemo(() => {
    const list = [...filteredResults];
    if (sortBy === "name") list.sort((a, b) => a.testName.localeCompare(b.testName));
    if (sortBy === "status")
      list.sort((a, b) => attentionRank(a.status.direction) - attentionRank(b.status.direction));
    return list;
  }, [filteredResults, sortBy]);

  const groups = useMemo(() => {
    const byCategory = new Map<HealthCategoryId, LabResult[]>();
    for (const result of filteredResults) {
      const list = byCategory.get(result.category) ?? [];
      list.push(result);
      byCategory.set(result.category, list);
    }
    const order = report?.categories ?? [];
    return order.filter((c) => byCategory.has(c)).map((c) => [c, byCategory.get(c)!] as const);
  }, [filteredResults, report?.categories]);

  const summary = useMemo(() => {
    const total = results?.length ?? 0;
    const inRange = results?.filter((r) => r.status.direction === "NORMAL").length ?? 0;
    const attention = results?.filter((r) => ATTENTION_DIRECTIONS.includes(r.status.direction)).length ?? 0;
    const notAvailable = results?.filter((r) => r.status.direction === "UNKNOWN").length ?? 0;
    return { total, inRange, attention, notAvailable };
  }, [results]);

  const attentionResults = useMemo(
    () =>
      [...(results ?? [])]
        .filter((r) => ATTENTION_DIRECTIONS.includes(r.status.direction))
        .sort((a, b) => attentionRank(a.status.direction) - attentionRank(b.status.direction))
        .slice(0, 4),
    [results],
  );

  const trendResults = useMemo(
    () => (results ?? []).filter((r) => r.previousValue !== null).slice(0, 4),
    [results],
  );

  function showAllAttention() {
    setSelectedCategories([]);
    setStatusFilter("attention");
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleDelete() {
    deleteMutation.mutate(reportId, {
      onSuccess: () => router.push("/reports"),
    });
  }

  if (isLoading) return <LoadingState label="Loading report…" />;
  if (isError || !report) {
    return (
      <ErrorState
        title="Report not found"
        description="This report doesn't exist, or you don't have access to it."
      />
    );
  }

  const statusTone: Tone =
    report.status === "COMPLETED" ? "success" : report.status === "FAILED" ? "critical" : "warning";
  const statusLabel =
    report.status === "COMPLETED" ? "Processed" : report.status === "FAILED" ? "Failed" : "Processing…";

  return (
    <div className="flex flex-col gap-6">
      <Link href="/reports" className="w-fit text-sm text-[var(--color-text-muted)] hover:underline">
        ← Back to Reports
      </Link>

      <div className="flex flex-col gap-2">
        <span className="text-[10.5px] font-bold tracking-[0.14em] text-[var(--color-accent)] uppercase">
          Lab Report
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[28px] font-medium text-[var(--color-text)]">{report.fileName}</h1>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap",
              TONE_PILL[statusTone],
            )}
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
            {statusLabel}
          </span>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          {formatDate(report.collectionDate)}
          {report.labName ? ` · ${report.labName}` : ""} · Uploaded {formatDateTime(report.uploadedAt)}
        </p>
      </div>

      {downloadMutation.isError ? (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          Couldn&apos;t download this file. Please try again.
        </p>
      ) : null}

      {report.status === "COMPLETED" && results && results.length > 0 ? (
        <>
          <ReportToolbar
            categories={report.categories}
            categoryCounts={categoryCounts}
            selectedCategories={selectedCategories}
            onCategoriesChange={setSelectedCategories}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            onDownload={() => downloadMutation.mutate(reportId)}
            isDownloading={downloadMutation.isPending}
            onShare={() => setIsShareOpen(true)}
            onDelete={() => setIsDeleteOpen(true)}
          />

          <Card className="@container relative overflow-hidden p-7">
            <span
              aria-hidden="true"
              className="absolute top-0 left-7 h-[3px] w-11 rounded-b-full bg-[var(--color-accent)]"
            />
            <h2 className="font-display text-2xl font-medium text-[var(--color-text)]">Health Summary</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {summary.attention > 0
                ? `Most of your results are within reference ranges. ${summary.attention} result${summary.attention === 1 ? "" : "s"} may need your attention.`
                : "All of your results are within reference ranges."}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 @lg:grid-cols-4">
              <div className="rounded-xl bg-[var(--status-green-tint)] p-4">
                <p className="font-display text-[26px] font-semibold text-[var(--status-green)]">
                  {summary.inRange}
                </p>
                <p className="mt-1 text-[13px] font-semibold text-[var(--status-green)]">In range</p>
                <p className="text-[11.5px] text-[var(--color-text-muted)]">
                  {summary.total > 0 ? Math.round((summary.inRange / summary.total) * 100) : 0}% of results
                </p>
              </div>
              <div className="rounded-xl bg-[var(--status-yellow-tint)] p-4">
                <p className="font-display text-[26px] font-semibold text-[var(--status-yellow)]">
                  {summary.attention}
                </p>
                <p className="mt-1 text-[13px] font-semibold text-[var(--status-yellow)]">Need attention</p>
                <p className="text-[11.5px] text-[var(--color-text-muted)]">
                  {summary.total > 0 ? Math.round((summary.attention / summary.total) * 100) : 0}% of results
                </p>
              </div>
              <div className="rounded-xl bg-[var(--color-surface-muted)] p-4">
                <p className="font-display text-[26px] font-semibold text-[var(--color-text)]">
                  {summary.notAvailable}
                </p>
                <p className="mt-1 text-[13px] font-semibold text-[var(--color-text)]">Not available</p>
                <p className="text-[11.5px] text-[var(--color-text-muted)]">
                  {summary.total > 0 ? Math.round((summary.notAvailable / summary.total) * 100) : 0}% of results
                </p>
              </div>
              <div className="rounded-xl bg-[var(--color-brand)] p-4">
                <p className="font-display text-[26px] font-semibold text-[var(--color-accent-bright)]">
                  {summary.total}
                </p>
                <p className="mt-1 text-[13px] font-semibold text-[var(--color-brand-foreground)] opacity-85">
                  Total results
                </p>
                <p className="text-[11.5px] text-[var(--color-brand-foreground)]/50">Analysed from this report</p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_320px]">
            <div id="results" className="flex flex-col gap-4">
              <div className="flex items-baseline gap-3">
                <h2 className="font-display text-xl font-medium text-[var(--color-text)]">Results</h2>
                <span aria-hidden="true" className="h-px flex-1 bg-[var(--color-border-strong)]" />
              </div>

              {filteredResults.length === 0 ? (
                <EmptyState
                  title="No matching results"
                  description="Try a different category or filter."
                  action={
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedCategories([]);
                        setStatusFilter("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  }
                />
              ) : sortBy === "category" ? (
                groups.map(([categoryId, categoryResults], index) => (
                  <ResultGroup
                    key={categoryId}
                    categoryId={categoryId}
                    results={categoryResults}
                    defaultOpen={index === 0}
                  />
                ))
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <ResultsTable results={sortedFlatResults} />
                </div>
              )}

              <CompareWithPreviousReport reportId={report.id} />
            </div>

            <aside className="flex flex-col gap-4">
              {attentionResults.length > 0 ? (
                <div>
                  <h2 className="flex items-center gap-2 font-display text-xl font-medium text-[var(--status-red)]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                    </svg>
                    Attention Required
                  </h2>
                  <Card className="mt-3 border-transparent bg-[var(--status-red-tint)] p-5">
                    <div className="flex flex-col">
                      {attentionResults.map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center justify-between gap-3 border-t border-[var(--status-red)]/15 py-2.5 first:border-t-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--status-red)]">
                              {result.testName}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {result.value} {result.unit}
                            </p>
                          </div>
                          <StatusPill result={result} />
                        </div>
                      ))}
                    </div>
                    {summary.attention > attentionResults.length ? (
                      <button
                        type="button"
                        onClick={showAllAttention}
                        className="mt-3 block w-full rounded-lg bg-[var(--color-surface)] px-3 py-2 text-center text-xs font-semibold text-[var(--status-red)]"
                      >
                        View all {summary.attention} in results →
                      </button>
                    ) : null}
                  </Card>
                </div>
              ) : null}

              {trendResults.length > 0 ? (
                <Card className="p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-[var(--color-text)]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.9">
                      <path d="M3 17 9 11l4 4 8-9" />
                      <path d="M15 6h6v6" />
                    </svg>
                    Trends from Previous Reports
                  </h3>
                  <div className="flex flex-col">
                    {trendResults.map((result) => {
                      const trend = computeTrend(result.value, result.previousValue);
                      const tone = toneFor(result.status.direction);
                      return (
                        <div
                          key={result.id}
                          className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] py-3 first:border-t-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                              {result.testName}
                            </p>
                            <p className="text-[11.5px] text-[var(--color-text-faint)] tabular-nums">
                              {result.previousValue} → {result.value} {result.unit}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <svg width="46" height="20" viewBox="0 0 46 20" fill="none">
                              <polyline
                                points={`4,${trend?.direction === "up" ? 16 : trend?.direction === "down" ? 4 : 10} 42,${trend?.direction === "up" ? 4 : trend?.direction === "down" ? 16 : 10}`}
                                stroke="var(--color-text-faint)"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                              <circle
                                cx="42"
                                cy={trend?.direction === "up" ? 4 : trend?.direction === "down" ? 16 : 10}
                                r="2.6"
                                className={cn(tone === "success" ? "fill-[var(--status-green)]" : tone === "critical" ? "fill-[var(--status-red)]" : "fill-[var(--status-yellow)]")}
                              />
                            </svg>
                            <p className="text-[11px] font-medium text-[var(--color-text-muted)]">
                              {trend?.direction === "up" ? "Increased" : trend?.direction === "down" ? "Decreased" : "No change"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ) : null}

              <Card className="p-5">
                <h3 className="mb-2 flex items-center gap-2 text-[15px] font-bold text-[var(--color-text)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.9">
                    <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.4 8.5 8.5 0 0 1-4-1L3 20l1.1-5.5a8.4 8.4 0 1 1 16.9-3Z" />
                  </svg>
                  Have questions?
                </h3>
                <p className="mb-4 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                  Get simple, easy-to-understand explanations of your results from Ask Healthy.
                </p>
                <Link href="/ask">
                  <Button size="sm" className="w-full">
                    Ask Healthy
                  </Button>
                </Link>
              </Card>
            </aside>
          </div>
        </>
      ) : null}

      {report.status !== "COMPLETED" || (results && results.length === 0) ? (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            isLoading={downloadMutation.isPending}
            onClick={() => downloadMutation.mutate(reportId)}
          >
            Download
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsShareOpen(true)}>
            Share
          </Button>
          <Button variant="danger" size="sm" onClick={() => setIsDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      ) : null}

      {report.status === "FAILED" ? (
        <ErrorState
          title="Processing failed"
          description={report.failureReason ?? "We couldn't extract structured results from this document."}
        />
      ) : null}

      {report.status !== "COMPLETED" && report.status !== "FAILED" ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] py-14 text-center">
          <span
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-brand)]"
          />
          <p className="text-sm text-[var(--color-text-muted)]">
            Healthy is processing this report. This page updates automatically.
          </p>
        </div>
      ) : null}

      {report.status === "COMPLETED" && results && results.length === 0 ? (
        <EmptyState title="No results extracted" description="This report had no readable test values." />
      ) : null}

      {isShareOpen ? (
        <ShareReportDialog
          reportName={report.fileName}
          categoryIds={report.categories}
          onClose={() => setIsShareOpen(false)}
        />
      ) : null}

      {isDeleteOpen ? (
        <ConfirmDialog
          title="Delete this report?"
          description={`This permanently deletes "${report.fileName}" and all of its extracted results. This can't be undone.`}
          confirmLabel="Delete report"
          isLoading={deleteMutation.isPending}
          error={deleteMutation.isError ? "Couldn't delete this report. Please try again." : null}
          onConfirm={handleDelete}
          onClose={() => setIsDeleteOpen(false)}
        />
      ) : null}
    </div>
  );
}
