import type { HealthCategoryId } from "@/lib/api/types";
import { HealthMasterDetail } from "@/components/health/HealthMasterDetail";
import { parseHealthStatusFilter } from "@/lib/health/status-filter";
import { RequireReports } from "@/components/reports/RequireReports";

interface HealthCategoryPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string }>;
}

export default async function HealthCategoryPage({ params, searchParams }: HealthCategoryPageProps) {
  const { id } = await params;
  const { filter } = await searchParams;
  return (
    <RequireReports description="Please upload reports to see this health category.">
      <HealthMasterDetail
        initialCategoryId={id as HealthCategoryId}
        initialStatusFilter={parseHealthStatusFilter(filter)}
      />
    </RequireReports>
  );
}
