import { PrescriptionDetail } from "@/components/prescriptions/PrescriptionDetail";

interface PrescriptionPageProps {
  params: Promise<{ id: string }>;
}

export default async function PrescriptionPage({ params }: PrescriptionPageProps) {
  const { id } = await params;
  return <PrescriptionDetail prescriptionId={id} />;
}
