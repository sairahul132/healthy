"use client";

import Link from "next/link";
import { usePrescription, usePrescriptionItems } from "@/lib/prescriptions/hooks";
import { formatDateTime } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { ProcessingStatus } from "@/components/reports/ProcessingStatus";
import { PrescriptionItemRow } from "./PrescriptionItemRow";

export function PrescriptionDetail({ prescriptionId }: { prescriptionId: string }) {
  const { data: prescription, isLoading, isError } = usePrescription(prescriptionId);
  const { data: items } = usePrescriptionItems(
    prescriptionId,
    prescription?.status === "COMPLETED",
  );

  if (isLoading) return <LoadingState label="Loading prescription…" />;
  if (isError || !prescription) {
    return (
      <ErrorState
        title="Prescription not found"
        description="This prescription doesn't exist, or you don't have access to it."
      />
    );
  }

  return (
    <div>
      <Link href="/medicines" className="text-sm text-[var(--color-text-muted)] hover:underline">
        ← Back to medicines
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium text-[var(--color-text)]">
            {prescription.fileName}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Uploaded {formatDateTime(prescription.uploadedAt)}
          </p>
        </div>
        <ProcessingStatus status={prescription.status} failureReason={prescription.failureReason} />
      </div>

      <Card className="mt-7">
        <CardHeader>
          <CardTitle>Extracted medicines</CardTitle>
        </CardHeader>
        <CardContent>
          {prescription.status === "FAILED" ? (
            <ErrorState
              title="Processing failed"
              description={prescription.failureReason ?? "We couldn't extract this prescription."}
            />
          ) : prescription.status !== "COMPLETED" ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span
                aria-hidden="true"
                className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-brand)]"
              />
              <p className="text-sm text-[var(--color-text-muted)]">Processing this prescription…</p>
            </div>
          ) : items && items.length === 0 ? (
            <EmptyState title="No medicines extracted" description="This document had no readable medicine lines." />
          ) : items ? (
            <div>
              {items.map((item) => (
                <PrescriptionItemRow key={item.id} prescriptionId={prescriptionId} item={item} />
              ))}
            </div>
          ) : (
            <LoadingState label="Loading items…" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
