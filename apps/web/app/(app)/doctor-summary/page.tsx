import { DoctorSummaryView } from "@/components/ai/DoctorSummaryView";
import { RequireReports } from "@/components/reports/RequireReports";

export default function DoctorSummaryPage() {
  return (
    <RequireReports description="Please upload reports to generate a doctor visit summary.">
      <DoctorSummaryView />
    </RequireReports>
  );
}
