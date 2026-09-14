import { HealthMasterDetail } from "@/components/health/HealthMasterDetail";
import { RequireReports } from "@/components/reports/RequireReports";

export default function HealthPage() {
  return (
    <RequireReports description="Please upload reports to see your health categories.">
      <HealthMasterDetail />
    </RequireReports>
  );
}
