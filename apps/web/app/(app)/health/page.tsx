import { HealthOverview } from "@/components/health/HealthOverview";
import { RequireReports } from "@/components/reports/RequireReports";

export default function HealthPage() {
  return (
    <div>
      <span className="text-[10.5px] font-bold tracking-[0.14em] text-[var(--color-accent)] uppercase">
        Your results, organized
      </span>
      <h1 className="mt-1 font-display text-2xl font-medium text-[var(--color-text)]">Health</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        The latest value for every test you&apos;ve been checked for — grouped by body system, with
        history behind the chart icon.
      </p>

      <div className="mt-7">
        <RequireReports description="Please upload reports to see your health categories.">
          <HealthOverview />
        </RequireReports>
      </div>
    </div>
  );
}
