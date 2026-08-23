"use client";

import Link from "next/link";
import { useReports } from "@/lib/reports/hooks";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { ReportCard } from "@/components/reports/ReportCard";

export default function ReportsPage() {
  const { data: reports, isLoading, isError, refetch } = useReports();

  return (
    <div>
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-[var(--color-text)]">Reports</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Every lab report you&apos;ve uploaded, with its extracted results.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/doctor-summary">
            <Button size="sm" variant="secondary">
              Doctor visit summary
            </Button>
          </Link>
          <Link href="/reports/upload">
            <Button size="sm">Upload report</Button>
          </Link>
        </div>
      </div>

      {isLoading ? <LoadingState label="Loading your reports…" /> : null}

      {isError ? (
        <ErrorState
          description="We couldn't load your reports."
          action={
            <Button size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      ) : null}

      {reports && reports.length === 0 ? (
        <EmptyState
          title="No reports yet"
          description="Upload your first lab report to see it structured, categorized, and explained here."
          action={
            <Link href="/reports/upload">
              <Button size="sm">Upload your first report</Button>
            </Link>
          }
        />
      ) : null}

      {reports && reports.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
