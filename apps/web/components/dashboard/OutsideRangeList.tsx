import Link from "next/link";
import type { LabResult } from "@/lib/api/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusPill, VisualRange } from "@/components/health/StatusVisuals";
import { formatDate } from "@/lib/utils/format";

/** Row layout mirrors design/health-page-mockup.html's .result-row exactly
 * (same column ratios, gap, padding) so a test looks the same here as it
 * does on the Health page — two independent layouts (mobile flex, desktop
 * grid) rather than one grid reflowed via `display:contents`, since Safari
 * doesn't place grid items correctly when their parent has that (see
 * CategorySection.tsx, which hit this first). */
function OutsideRangeRow({ result }: { result: LabResult }) {
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
  const chevron = (
    <span
      aria-hidden="true"
      className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)]"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );

  return (
    <Link
      href={`/health/${result.category}?filter=attention`}
      className="block border-b border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-muted)]"
    >
      {/* Mobile: stacked */}
      <div className="flex flex-col gap-3 px-5 py-4 sm:hidden">
        <div className="flex items-start justify-between gap-3">
          {name}
          {chevron}
        </div>
        <div className="flex items-center justify-between gap-3">
          {value}
          <StatusPill result={result} />
        </div>
        <VisualRange result={result} />
        {date}
      </div>

      {/* Desktop: one row, same column ratios as the Health page */}
      <div className="hidden sm:grid sm:grid-cols-[1.5fr_1fr_1.6fr_0.9fr_0.9fr_44px] sm:items-center sm:gap-[18px] sm:px-[22px] sm:py-4">
        {name}
        {value}
        <VisualRange result={result} />
        <StatusPill result={result} />
        {date}
        {chevron}
      </div>
    </Link>
  );
}

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
      <div className="border-t border-[var(--color-border)]">
        {results.map((result) => (
          <OutsideRangeRow key={result.id} result={result} />
        ))}
      </div>
    </Card>
  );
}
