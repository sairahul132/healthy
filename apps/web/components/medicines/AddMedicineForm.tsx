"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/types";
import { useCreateMedicine } from "@/lib/medicines/hooks";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export function AddMedicineForm({ onDone }: { onDone?: () => void }) {
  const [name, setName] = useState("");
  const [strength, setStrength] = useState("");
  const [frequency, setFrequency] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useCreateMedicine();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Enter a medicine name.");
      return;
    }
    try {
      await mutation.mutateAsync({
        name: name.trim(),
        strength: strength.trim() || undefined,
        frequency: frequency.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      setName("");
      setStrength("");
      setFrequency("");
      setReason("");
      onDone?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add that medicine. Try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Medicine name" value={name} onChange={(e) => setName(e.target.value)} disabled={mutation.isPending} />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Strength"
          placeholder="500mg"
          value={strength}
          onChange={(e) => setStrength(e.target.value)}
          disabled={mutation.isPending}
        />
        <Field
          label="Frequency"
          placeholder="Twice daily"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          disabled={mutation.isPending}
        />
      </div>
      <Field
        label="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={mutation.isPending}
      />
      {error ? (
        <p role="alert" className="text-sm font-medium text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" size="sm" isLoading={mutation.isPending}>
          Add medicine
        </Button>
      </div>
    </form>
  );
}
