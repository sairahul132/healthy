import Link from "next/link";
import type { TimelineEvent, TimelineEventType } from "@/lib/api/types";
import { formatDate } from "@/lib/utils/format";

const TYPE_META: Record<TimelineEventType, { icon: string; label: string }> = {
  LAB_REPORT: { icon: "🧪", label: "Lab report" },
  DOCTOR_VISIT: { icon: "🩺", label: "Doctor visit" },
  PRESCRIPTION: { icon: "📋", label: "Prescription" },
  MEDICINE: { icon: "💊", label: "Medicine" },
  DIAGNOSIS: { icon: "📖", label: "Diagnosis" },
  PROCEDURE: { icon: "⚕️", label: "Procedure" },
  IMAGING: { icon: "🖼️", label: "Imaging" },
  VACCINATION: { icon: "💉", label: "Vaccination" },
  DOCUMENT: { icon: "📄", label: "Document" },
};

export function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const meta = TYPE_META[event.type];

  const content = (
    <div className="flex-1 pb-8">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
        {meta.label} · {formatDate(event.occurredAt)}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-[var(--color-text)]">{event.title}</p>
      {event.description ? (
        <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{event.description}</p>
      ) : null}
    </div>
  );

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-base"
        >
          {meta.icon}
        </span>
        {!isLast ? <span aria-hidden="true" className="w-px flex-1 bg-[var(--color-border)]" /> : null}
      </div>
      {event.relatedReportId ? (
        <Link href={`/reports/${event.relatedReportId}`} className="flex-1 hover:opacity-80">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}
