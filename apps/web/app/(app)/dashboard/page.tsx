"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth/session-context";
import { useReports } from "@/lib/reports/hooks";
import { useAttentionSummary } from "@/lib/health/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { ReportCard } from "@/components/reports/ReportCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DataCompleteness } from "@/components/dashboard/DataCompleteness";
import { IdentityCard } from "@/components/dashboard/IdentityCard";
import { OutsideRangeList } from "@/components/dashboard/OutsideRangeList";

export default function DashboardPage() {
  const { user } = useSession();
  const { data: reports, isLoading } = useReports();
  const { data: attentionSummary } = useAttentionSummary();

  const recentReports = reports?.slice(0, 3) ?? [];
  const knownCategories = Array.from(
    new Set((reports ?? []).filter((r) => r.status === "COMPLETED").flatMap((r) => r.categories)),
  );
  const attentionCount = attentionSummary?.abnormalCount ?? 0;
  const [outsideRangeOpen, setOutsideRangeOpen] = useState(false);

  return (
    <div className="flex flex-col gap-7">
      <div>
        <span className="text-[10.5px] font-bold tracking-[0.14em] text-[var(--color-accent)] uppercase">
          Your Vault
        </span>
        <h1 className="mt-1 font-display text-2xl font-medium text-[var(--color-text)]">Home</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-[var(--color-accent)]">
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
          </svg>
          Private by default — nothing here is public unless you choose to share it.
        </p>
      </div>

      <IdentityCard
        healthyId={user?.healthyId ?? "—"}
        name={user?.name ?? null}
        attentionCount={attentionCount}
        outsideRangeOpen={outsideRangeOpen}
        onToggleOutsideRange={() => setOutsideRangeOpen((v) => !v)}
      />

      {outsideRangeOpen ? <OutsideRangeList results={attentionSummary?.results ?? []} /> : null}

      <QuickActions hasReports={(reports?.length ?? 0) > 0} />

      <Card>
        <CardHeader>
          <CardTitle>Health overview</CardTitle>
        </CardHeader>
        <CardContent>
          <DataCompleteness knownCategories={knownCategories} />
        </CardContent>
      </Card>

      <div>
        <div className="mb-3.5 flex items-center gap-3">
          <h2 className="font-display text-base font-medium text-[var(--color-text)]">
            Recent reports
          </h2>
          <span aria-hidden="true" className="h-px flex-1 bg-[var(--color-border-strong)]" />
          <Link href="/reports" className="text-sm font-medium text-[var(--color-accent)] hover:underline">
            View all
          </Link>
        </div>

        {isLoading ? <LoadingState label="Loading reports…" /> : null}

        {reports && reports.length === 0 ? (
          <EmptyState
            title="No reports yet"
            description="Upload your first lab report to see it structured and explained here."
            action={
              <Link href="/reports/upload">
                <Button size="sm">Upload report</Button>
              </Link>
            }
          />
        ) : null}

        {recentReports.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {recentReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
