import Link from "next/link";
import type { LabResult } from "@/lib/api/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusPill } from "@/components/health/StatusVisuals";

/** The dashboard's "what needs attention" list — every test whose latest
 * result is currently outside its reference range, worst first (see
 * ReportsService.get_attention_summary's severity sort). Distinct from the
 * count badge on IdentityCard: that answers "how many", this answers
 * "which ones" and links straight to each test's Health page. */
export function OutsideRangeList({ results }: { results: LabResult[] }) {
  if (results.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div>
          <CardTitle>Outside range</CardTitle>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Based on each test&rsquo;s most recent result
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--status-red-tint)] px-2.5 py-1 text-xs font-semibold text-[var(--status-red)]">
          {results.length}
        </span>
      </CardHeader>
      <div className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
        {results.map((result) => (
          <Link
            key={result.id}
            href={`/health/${result.category}`}
            className="flex items-center justify-between gap-3 px-6 py-3.5 transition-colors hover:bg-[var(--color-surface-muted)]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--color-text)]">
                {result.canonicalTestName}
              </p>
              <p className="mt-0.5 font-mono text-xs text-[var(--color-text-faint)]">
                {result.value} {result.unit}
              </p>
            </div>
            <StatusPill result={result} />
          </Link>
        ))}
      </div>
    </Card>
  );
}
