import { HealthMasterDetail } from "@/components/health/HealthMasterDetail";
import { parseHealthStatusFilter } from "@/lib/health/status-filter";
import { RequireReports } from "@/components/reports/RequireReports";

interface HealthPageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function HealthPage({ searchParams }: HealthPageProps) {
  const { filter } = await searchParams;
  return (
    <RequireReports description="Please upload reports to see your health categories.">
      <HealthMasterDetail initialStatusFilter={parseHealthStatusFilter(filter)} />
    </RequireReports>
  );
}
