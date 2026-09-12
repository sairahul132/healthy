import { CategoryDetail } from "@/components/health/CategoryDetail";
import { RequireReports } from "@/components/reports/RequireReports";

interface HealthCategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function HealthCategoryPage({ params }: HealthCategoryPageProps) {
  const { id } = await params;
  return (
    <RequireReports description="Please upload reports to see this health category.">
      <CategoryDetail categoryId={id} />
    </RequireReports>
  );
}
