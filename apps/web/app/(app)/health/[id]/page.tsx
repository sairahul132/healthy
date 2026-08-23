import { CategoryDetail } from "@/components/health/CategoryDetail";

interface HealthCategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function HealthCategoryPage({ params }: HealthCategoryPageProps) {
  const { id } = await params;
  return <CategoryDetail categoryId={id} />;
}
