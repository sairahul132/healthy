import type { HealthCategoryId } from "@/lib/api/types";
import { HealthMasterDetail } from "@/components/health/HealthMasterDetail";
import { RequireReports } from "@/components/reports/RequireReports";

interface HealthCategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function HealthCategoryPage({ params }: HealthCategoryPageProps) {
  const { id } = await params;
  return (
    <RequireReports description="Please upload reports to see this health category.">
      <HealthMasterDetail initialCategoryId={id as HealthCategoryId} />
    </RequireReports>
  );
}
