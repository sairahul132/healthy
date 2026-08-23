"use client";

import { useMedicines, useUpdateMedicine } from "@/lib/medicines/hooks";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";

export function MedicineList() {
  const { data: medicines, isLoading, isError, refetch } = useMedicines();
  const updateMutation = useUpdateMedicine();

  if (isLoading) return <LoadingState label="Loading medicines…" />;
  if (isError) {
    return (
      <ErrorState
        description="We couldn't load your medicines."
        action={
          <button onClick={() => refetch()} className="text-sm font-medium text-[var(--color-brand)]">
            Retry
          </button>
        }
      />
    );
  }
  if (!medicines || medicines.length === 0) {
    return <EmptyState title="No medicines yet" description="Add one above, or upload a prescription." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {medicines.map((medicine) => (
        <Card
          key={medicine.id}
          className={`flex items-center justify-between gap-3 p-4 ${medicine.active ? "" : "opacity-60"}`}
        >
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">
              {medicine.name}
              {medicine.strength ? ` · ${medicine.strength}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              {medicine.frequency ?? "No frequency set"}
              {medicine.reason ? ` · ${medicine.reason}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              updateMutation.mutate({ id: medicine.id, input: { active: !medicine.active } })
            }
            className="shrink-0 rounded-full border border-[var(--color-border-strong)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            {medicine.active ? "Mark inactive" : "Mark active"}
          </button>
        </Card>
      ))}
    </div>
  );
}
