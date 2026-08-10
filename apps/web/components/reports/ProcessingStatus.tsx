import type { ReportProcessingStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";

const LABELS: Record<ReportProcessingStatus, string> = {
  UPLOADED: "Uploaded",
  SCANNING: "Scanning for malware",
  PROCESSING: "Processing document",
  EXTRACTING: "Extracting results",
  ANALYZING: "Analyzing values",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export function ProcessingStatus({
  status,
  failureReason,
  className,
}: {
  status: ReportProcessingStatus;
  failureReason?: string | null;
  className?: string;
}) {
  if (status === "COMPLETED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-[var(--status-green)]",
          className,
        )}
      >
        <span aria-hidden="true">●</span>
        Processed
      </span>
    );
  }

  if (status === "FAILED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium text-[var(--status-red)]",
          className,
        )}
        title={failureReason ?? undefined}
      >
        <span aria-hidden="true">■</span>
        {failureReason ?? "Processing failed"}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-brand)]"
      />
      {LABELS[status]}
    </span>
  );
}
