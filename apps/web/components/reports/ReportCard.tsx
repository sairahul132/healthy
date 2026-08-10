import Link from "next/link";
import type { LabReport } from "@/lib/api/types";
import { getCategory } from "@/lib/health/categories";
import { formatDate } from "@/lib/utils/format";
import { Card } from "@/components/ui/Card";
import { ProcessingStatus } from "./ProcessingStatus";

function summaryLabel(report: LabReport): string {
  if (report.status === "FAILED") return "Processing failed — tap to view details";
  if (report.status !== "COMPLETED") return "Processing…";
  if (report.resultCount === 0) return "No tests extracted";
  if (report.abnormalCount === 0) return "All tests within range";
  return `${report.abnormalCount} of ${report.resultCount} need attention`;
}

export function ReportCard({ report }: { report: LabReport }) {
  return (
    <Link href={`/reports/${report.id}`} className="block focus-visible:outline-none">
      <Card className="p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--color-brand)]/30 hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-[15px] font-medium text-[var(--color-text)]">{report.fileName}</p>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              {formatDate(report.collectionDate)}
              {report.labName ? ` · ${report.labName}` : ""}
            </p>
          </div>
          <ProcessingStatus status={report.status} failureReason={report.failureReason} />
        </div>

        {report.categories.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {report.categories.map((categoryId) => {
              const category = getCategory(categoryId);
              return (
                <span
                  key={categoryId}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]"
                >
                  <span aria-hidden="true">{category.icon}</span>
                  {category.label}
                </span>
              );
            })}
          </div>
        ) : null}

        <p className="mt-3 text-sm text-[var(--color-text-muted)]">{summaryLabel(report)}</p>
      </Card>
    </Link>
  );
}
