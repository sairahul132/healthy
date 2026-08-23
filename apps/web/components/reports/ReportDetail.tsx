"use client";

import { useState } from "react";
import Link from "next/link";
import { useReport, useReportResults } from "@/lib/reports/hooks";
import { useCompareReport } from "@/lib/ai/hooks";
import { ApiError } from "@/lib/api/types";
import { getCategory } from "@/lib/health/categories";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { ProcessingStatus } from "./ProcessingStatus";
import { ResultRow } from "./ResultRow";

function CompareWithPreviousReport({ reportId }: { reportId: string }) {
  const compare = useCompareReport();
  const [noPrevious, setNoPrevious] = useState(false);

  if (compare.isSuccess) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Compared to previous report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-[var(--color-text)]">
            {compare.data.narrative}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (noPrevious) {
    return (
      <p className="mt-3 text-sm text-[var(--color-text-muted)]">
        This is your earliest report for these tests — nothing to compare yet.
      </p>
    );
  }

  return (
    <div className="mt-3">
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

export function ReportDetail({ reportId }: { reportId: string }) {
  const { data: report, isLoading, isError } = useReport(reportId);
  const { data: results } = useReportResults(reportId, report?.status === "COMPLETED");

  if (isLoading) return <LoadingState label="Loading report…" />;
  if (isError || !report) {
    return (
      <ErrorState
        title="Report not found"
        description="This report doesn't exist, or you don't have access to it."
      />
    );
  }

  return (
    <div>
      <Link href="/reports" className="text-sm text-[var(--color-text-muted)] hover:underline">
        ← Back to reports
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium text-[var(--color-text)]">{report.fileName}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {formatDate(report.collectionDate)}
            {report.labName ? ` · ${report.labName}` : ""} · Uploaded{" "}
            {formatDateTime(report.uploadedAt)}
          </p>
        </div>
        <ProcessingStatus status={report.status} failureReason={report.failureReason} />
      </div>

      {report.categories.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {report.categories.map((categoryId) => {
            const category = getCategory(categoryId);
            return (
              <span
                key={categoryId}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]"
              >
                <span aria-hidden="true">{category.icon}</span>
                {category.label}
              </span>
            );
          })}
        </div>
      ) : null}

      <Card className="mt-7">
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          {report.status === "FAILED" ? (
            <ErrorState
              title="Processing failed"
              description={
                report.failureReason ??
                "We couldn't extract structured results from this document."
              }
            />
          ) : report.status !== "COMPLETED" ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span
                aria-hidden="true"
                className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-brand)]"
              />
              <p className="text-sm text-[var(--color-text-muted)]">
                Healthy is processing this report. This page updates automatically.
              </p>
            </div>
          ) : results && results.length === 0 ? (
            <EmptyState title="No results extracted" description="This report had no readable test values." />
          ) : results ? (
            <div>
              {results.map((result) => (
                <ResultRow key={result.id} result={result} />
              ))}
            </div>
          ) : (
            <LoadingState label="Loading results…" />
          )}
        </CardContent>
      </Card>

      {report.status === "COMPLETED" && results && results.length > 0 ? (
        <CompareWithPreviousReport reportId={report.id} />
      ) : null}
    </div>
  );
}
