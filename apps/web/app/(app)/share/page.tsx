import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CreateShareForm } from "@/components/sharing/CreateShareForm";
import { ActiveShares } from "@/components/sharing/ActiveShares";
import { PendingRequests } from "@/components/sharing/PendingRequests";
import { RequireReports } from "@/components/reports/RequireReports";

export default function SharePage() {
  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="font-display text-2xl font-medium text-[var(--color-text)]">Share</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Nothing leaves your vault until you choose who sees it, and for how long.
        </p>
      </div>

      <RequireReports
        title="Reports are not available"
        description="Upload reports to share."
        actionLabel="Upload reports to share"
      >
        <div className="flex flex-col gap-7">
          <Card>
            <CardHeader>
              <CardTitle>Create a share</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateShareForm />
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-3.5 font-display text-base font-medium text-[var(--color-text)]">
              Pending requests
            </h2>
            <PendingRequests />
          </div>

          <div>
            <h2 className="mb-3.5 font-display text-base font-medium text-[var(--color-text)]">
              Active shares
            </h2>
            <ActiveShares />
          </div>
        </div>
      </RequireReports>
    </div>
  );
}
