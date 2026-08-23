"use client";

import Link from "next/link";
import { usePrescriptions } from "@/lib/prescriptions/hooks";
import { formatDate } from "@/lib/utils/format";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { ProcessingStatus } from "@/components/reports/ProcessingStatus";

export function PrescriptionList() {
  const { data: prescriptions, isLoading, isError, refetch } = usePrescriptions();

  if (isLoading) return <LoadingState label="Loading prescriptions…" />;
  if (isError) {
    return (
      <ErrorState
        description="We couldn't load your prescriptions."
        action={
          <button onClick={() => refetch()} className="text-sm font-medium text-[var(--color-brand)]">
            Retry
          </button>
        }
      />
    );
  }
  if (!prescriptions || prescriptions.length === 0) {
    return <EmptyState title="No prescriptions uploaded" description="Upload one to extract its medicines." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {prescriptions.map((prescription) => (
        <Link key={prescription.id} href={`/medicines/prescriptions/${prescription.id}`}>
          <Card className="flex items-center justify-between gap-3 p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--color-brand)]/30 hover:shadow-md">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">{prescription.fileName}</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                {formatDate(prescription.uploadedAt)}
                {prescription.status === "COMPLETED" ? ` · ${prescription.itemCount} medicine(s)` : ""}
              </p>
            </div>
            <ProcessingStatus status={prescription.status} failureReason={prescription.failureReason} />
          </Card>
        </Link>
      ))}
    </div>
  );
}
