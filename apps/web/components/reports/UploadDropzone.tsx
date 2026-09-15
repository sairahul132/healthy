"use client";

import { useRouter } from "next/navigation";
import { type DragEvent, useRef, useState } from "react";
import { useUploadReport } from "@/lib/reports/hooks";
import { ReportValidationError } from "@/lib/reports/provider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface FileUploadState {
  name: string;
  status: "uploading" | "done" | "error";
  message?: string;
}

export function UploadDropzone() {
  const router = useRouter();
  const uploadMutation = useUploadReport();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [items, setItems] = useState<FileUploadState[]>([]);

  async function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    setIsUploading(true);
    setItems(files.map((file) => ({ name: file.name, status: "uploading" })));

    let lastSuccessfulId: string | null = null;
    let successCount = 0;
    let errorCount = 0;

    // Uploaded one at a time (not Promise.all) so each report's row appears
    // in order and a slow/failing file doesn't block the API with a burst
    // of concurrent requests.
    for (const [index, file] of files.entries()) {
      try {
        const report = await uploadMutation.mutateAsync(file);
        lastSuccessfulId = report.id;
        successCount += 1;
        setItems((prev) =>
          prev.map((item, i) => (i === index ? { ...item, status: "done" } : item)),
        );
      } catch (err) {
        errorCount += 1;
        const message =
          err instanceof ReportValidationError
            ? err.message
            : "Couldn't upload this file. Please try again.";
        setItems((prev) =>
          prev.map((item, i) => (i === index ? { ...item, status: "error", message } : item)),
        );
      }
    }

    setIsUploading(false);
    // Only auto-navigate away when every file made it through — if
    // anything failed, stay put so the per-file error stays visible
    // instead of whisking the user past it.
    if (successCount > 0 && errorCount === 0) {
      router.push(successCount === 1 && lastSuccessfulId ? `/reports/${lastSuccessfulId}` : "/reports");
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
          Drag and drop lab reports, or
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          isLoading={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          Browse files
        </Button>
        <p className="text-xs text-[var(--color-text-faint)]">
          PDF, JPG, PNG, TXT, or CSV · up to 20 MB each · select multiple to upload them all at once
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.txt,.csv"
          className="sr-only"
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </div>
      {items.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex items-center gap-2.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs",
                  item.status === "done" && "bg-[var(--status-green-tint)] text-[var(--status-green)]",
                  item.status === "error" && "bg-[var(--status-red-tint)] text-[var(--status-red)]",
                  item.status === "uploading" && "border-2 border-[var(--color-border-strong)] border-t-[var(--color-brand)] animate-spin",
                )}
              >
                {item.status === "done" ? "✓" : item.status === "error" ? "!" : null}
              </span>
              <span className="min-w-0 flex-1 truncate text-[var(--color-text)]">{item.name}</span>
              {item.status === "error" && item.message ? (
                <span className="shrink-0 text-xs text-[var(--color-danger)]">{item.message}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 text-xs text-[var(--color-text-faint)]">
        Scanned images and image-only PDFs can&apos;t be read automatically yet — a text-based PDF,
        TXT, or CSV export works best.
      </p>
    </div>
  );
}
