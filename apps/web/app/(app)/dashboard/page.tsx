"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth/session-context";
import { useReports } from "@/lib/reports/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { ReportCard } from "@/components/reports/ReportCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DataCompleteness } from "@/components/dashboard/DataCompleteness";
import { IdentityCard } from "@/components/dashboard/IdentityCard";

export default function DashboardPage() {
  const { user } = useSession();
  const { data: reports, isLoading } = useReports();

  const recentReports = reports?.slice(0, 3) ?? [];
  const knownCategories = Array.from(
    new Set((reports ?? []).filter((r) => r.status === "COMPLETED").flatMap((r) => r.categories)),
  );
  const attentionCount = (reports ?? []).reduce((sum, r) => sum + r.abnormalCount, 0);

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="font-display text-2xl font-medium text-[var(--color-text)]">Home</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Your health data. Your vault. Your permission.
        </p>
      </div>

      <IdentityCard
        healthifyId={user?.healthifyId ?? "—"}
        name={user?.name ?? null}
        attentionCount={attentionCount}
      />

      <QuickActions />

      <Card>
        <CardHeader>
          <CardTitle>Health overview</CardTitle>
        </CardHeader>
        <CardContent>
          <DataCompleteness knownCategories={knownCategories} />
        </CardContent>
      </Card>

      <div>
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="font-display text-base font-medium text-[var(--color-text)]">
            Recent reports
          </h2>
          <Link href="/reports" className="text-sm font-medium text-[var(--color-brand)] hover:underline">
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
