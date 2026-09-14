import type { HealthCategoryId } from "@/lib/api/types";
import { HealthOverview } from "@/components/health/HealthOverview";
import { RequireReports } from "@/components/reports/RequireReports";

interface HealthCategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function HealthCategoryPage({ params }: HealthCategoryPageProps) {
  const { id } = await params;
  return (
    <div>
      <span className="text-[10.5px] font-bold tracking-[0.14em] text-[var(--color-accent)] uppercase">
        Your results, organized
      </span>
      <h1 className="mt-1 font-display text-2xl font-medium text-[var(--color-text)]">Health</h1>

      <div className="mt-7">
        <RequireReports description="Please upload reports to see this health category.">
          <HealthOverview initialCategory={id as HealthCategoryId} />
        </RequireReports>
      </div>
    </div>
  );
}
