import { PatientCategoriesView } from "@/components/doctor/PatientCategoriesView";

interface DoctorPatientPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function DoctorPatientPage({ params }: DoctorPatientPageProps) {
  const { sessionId } = await params;
  return <PatientCategoriesView sessionId={sessionId} />;
}
