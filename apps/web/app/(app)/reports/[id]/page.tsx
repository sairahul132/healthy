import { ReportDetail } from "@/components/reports/ReportDetail";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  return <ReportDetail reportId={id} />;
}
