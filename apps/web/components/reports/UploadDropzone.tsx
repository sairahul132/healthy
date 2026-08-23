"use client";

import { useRouter } from "next/navigation";
import { type DragEvent, useRef, useState } from "react";
import { useUploadReport } from "@/lib/reports/hooks";
import { ReportValidationError } from "@/lib/reports/provider";
import { Button } from "@/components/ui/Button";

export function UploadDropzone() {
  const router = useRouter();
  const uploadMutation = useUploadReport();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    try {
      const report = await uploadMutation.mutateAsync(file);
      router.push(`/reports/${report.id}`);
    } catch (err) {
      setError(
        err instanceof ReportValidationError
          ? err.message
          : "Couldn't upload that file. Please try again.",
      );
    }
  }

  return (
    <div>
      <div
        onDragOver={(event: DragEvent) => {
          event.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(event: DragEvent) => {
          event.preventDefault();
          setIsDraggingOver(false);
          void handleFiles(event.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-all duration-150 ${
          isDraggingOver
            ? "border-[var(--color-brand)] bg-[var(--color-brand-tint)]"
            : "border-[var(--color-border-strong)]"
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-tint)] text-[var(--color-brand)]">
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 15V4M12 4 8 8M12 4l4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
          </svg>
        </span>
        <p className="font-display text-[15px] font-medium text-[var(--color-text)]">
          Drag and drop a lab report, or
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          isLoading={uploadMutation.isPending}
          onClick={() => inputRef.current?.click()}
        >
          Browse files
        </Button>
        <p className="text-xs text-[var(--color-text-faint)]">
          PDF, JPG, PNG, TXT, or CSV · up to 20 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.txt,.csv"
          className="sr-only"
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-[var(--color-text-faint)]">
        Scanned images and image-only PDFs can&apos;t be read automatically yet — a text-based PDF,
        TXT, or CSV export works best.
      </p>
    </div>
  );
}
