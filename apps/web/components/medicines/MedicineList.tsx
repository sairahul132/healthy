"use client";

import { useState } from "react";
import type { Medicine } from "@/lib/api/types";
import { ApiError } from "@/lib/api/types";
import { useDeleteMedicine, useMedicines, useUpdateMedicine } from "@/lib/medicines/hooks";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";

function EditMedicineForm({ medicine, onDone }: { medicine: Medicine; onDone: () => void }) {
  const [name, setName] = useState(medicine.name);
  const [strength, setStrength] = useState(medicine.strength ?? "");
  const [frequency, setFrequency] = useState(medicine.frequency ?? "");
  const [reason, setReason] = useState(medicine.reason ?? "");
  const [error, setError] = useState<string | null>(null);
  const mutation = useUpdateMedicine();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Enter a medicine name.");
      return;
    }
    try {
      await mutation.mutateAsync({
        id: medicine.id,
        input: {
          name: name.trim(),
          strength: strength.trim() || undefined,
          frequency: frequency.trim() || undefined,
          reason: reason.trim() || undefined,
        },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save changes. Try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-[var(--color-border)] p-4">
      <Field label="Medicine name" value={name} onChange={(e) => setName(e.target.value)} disabled={mutation.isPending} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Strength" value={strength} onChange={(e) => setStrength(e.target.value)} disabled={mutation.isPending} />
        <Field label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} disabled={mutation.isPending} />
      </div>
      <Field label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} disabled={mutation.isPending} />
      {error ? (
        <p role="alert" className="text-sm font-medium text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={mutation.isPending}>
          Save changes
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function MedicineRow({ medicine }: { medicine: Medicine }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const updateMutation = useUpdateMedicine();
  const deleteMutation = useDeleteMedicine();

  return (
    <Card className={medicine.active ? "" : "opacity-60"}>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--color-text)]">
            {medicine.name}
            {medicine.strength ? ` · ${medicine.strength}` : ""}
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
            {medicine.frequency ?? "No frequency set"}
            {medicine.reason ? ` · ${medicine.reason}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-label={`Edit ${medicine.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" strokeLinecap="round" />
              <path
                d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() =>
              updateMutation.mutate({ id: medicine.id, input: { active: !medicine.active } })
            }
            className="rounded-full border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            {medicine.active ? "Mark inactive" : "Mark active"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Delete ${medicine.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:border-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-8 0l1 13a2 2 0 002 2h4a2 2 0 002-2l1-13" />
            </svg>
          </button>
        </div>
      </div>

      {editing ? (
        <EditMedicineForm medicine={medicine} onDone={() => setEditing(false)} />
      ) : null}

      {confirmDelete ? (
        <ConfirmDialog
          title="Delete this medicine?"
          description={`Removes "${medicine.name}" and its card from your timeline. This can't be undone.`}
          confirmLabel="Delete medicine"
          isLoading={deleteMutation.isPending}
          error={deleteMutation.error instanceof ApiError ? deleteMutation.error.message : null}
          onConfirm={() =>
            deleteMutation.mutate(medicine.id, { onSuccess: () => setConfirmDelete(false) })
          }
          onClose={() => setConfirmDelete(false)}
        />
      ) : null}
    </Card>
  );
}

export function MedicineList() {
  const { data: medicines, isLoading, isError, refetch } = useMedicines();

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
        <MedicineRow key={medicine.id} medicine={medicine} />
      ))}
    </div>
  );
}
