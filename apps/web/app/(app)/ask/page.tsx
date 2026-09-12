import { AskHealthy } from "@/components/ai/AskHealthy";
import { RequireReports } from "@/components/reports/RequireReports";

export default function AskPage() {
  return (
    <RequireReports description="Please upload reports to ask Healthy about your results.">
      <AskHealthy />
    </RequireReports>
  );
}
