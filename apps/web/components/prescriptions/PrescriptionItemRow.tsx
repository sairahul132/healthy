"use client";

import { useState } from "react";
import type { PrescriptionItem } from "@/lib/api/types";
import { useCorrectPrescriptionItem } from "@/lib/prescriptions/hooks";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export function PrescriptionItemRow({
  prescriptionId,
  item,
}: {
  prescriptionId: string;
  item: PrescriptionItem;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [medicineName, setMedicineName] = useState(item.medicineName);
  const [dosage, setDosage] = useState(item.dosage ?? "");
  const [frequency, setFrequency] = useState(item.frequency ?? "");
  const [duration, setDuration] = useState(item.duration ?? "");
  const mutation = useCorrectPrescriptionItem(prescriptionId);

  if (isEditing) {
    return (
      <div className="border-b border-[var(--color-border)] py-4 last:border-b-0">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="Medicine" value={medicineName} onChange={(e) => setMedicineName(e.target.value)} />
          <Field label="Dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} />
          <Field label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} />
          <Field label="Duration" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            isLoading={mutation.isPending}
            onClick={async () => {
              await mutation.mutateAsync({
                itemId: item.id,
                input: {
                  medicineName,
                  dosage: dosage || null,
                  frequency: frequency || null,
                  duration: duration || null,
                },
              });
              setIsEditing(false);
            }}
          >
            Save correction
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] py-4 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-[var(--color-text)]">{item.medicineName}</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          {[item.dosage, item.frequency, item.duration].filter(Boolean).join(" · ") || "No details extracted"}
        </p>
        {item.corrected ? (
          <p className="mt-1 text-xs text-[var(--color-brand)]">Corrected by you</p>
        ) : item.extractionConfidence < 0.7 ? (
          <p className="mt-1 text-xs text-[var(--status-yellow)]">Please verify this — low extraction confidence</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="shrink-0 text-xs font-medium text-[var(--color-brand)] hover:underline"
      >
        Correct
      </button>
    </div>
  );
}
