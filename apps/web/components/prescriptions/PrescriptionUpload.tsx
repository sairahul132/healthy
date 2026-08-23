"use client";

import { useRef, useState } from "react";
import { useUploadPrescription } from "@/lib/prescriptions/hooks";
import { ApiError } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";

export function PrescriptionUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadPrescription();
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    try {
      await uploadMutation.mutateAsync(file);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't upload that file. Try again.");
    }
  }

  return (
    <div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        isLoading={uploadMutation.isPending}
        onClick={() => inputRef.current?.click()}
      >
        Upload prescription
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.txt,.csv"
        className="sr-only"
        onChange={(event) => void handleFiles(event.target.files)}
      />
      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
