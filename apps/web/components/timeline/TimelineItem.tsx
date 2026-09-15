"use client";

import { useState } from "react";
import Link from "next/link";
import type { TimelineEvent, TimelineEventType } from "@/lib/api/types";
import { ApiError } from "@/lib/api/types";
import { useDeleteTimelineEvent, useDeleteReport } from "@/lib/reports/hooks";
import { useDeleteMedicine } from "@/lib/medicines/hooks";
import { formatDate } from "@/lib/utils/format";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils/cn";

const TYPE_META: Record<TimelineEventType, { label: string; icon: React.ReactNode }> = {
  LAB_REPORT: {
    label: "Lab report",
    icon: <path d="M7 3h10a1 1 0 011 1v16l-6-3-6 3V4a1 1 0 011-1z" />,
  },
  DOCTOR_VISIT: {
    label: "Doctor visit",
    icon: (
      <>
        <path d="M9 3v4M15 3v4M4 11h16M5 7h14a1 1 0 011 1v11a1 1 0 01-1 1H5a1 1 0 01-1-1V8a1 1 0 011-1z" />
        <path d="M12 14v4M10 16h4" />
      </>
    ),
  },
  PRESCRIPTION: {
    label: "Prescription",
    icon: <path d="M4 5.5h13a2.5 2.5 0 010 5H8m0 0v9m0-9l9 9" />,
  },
  MEDICINE: {
    label: "Medicine",
    icon: (
      <>
        <rect x="4" y="7" width="16" height="13" rx="2" />
        <path d="M9 7V5a3 3 0 016 0v2" />
      </>
    ),
  },
  DIAGNOSIS: {
    label: "Diagnosis",
    icon: <path d="M4 5.5h16v13a1 1 0 01-1 1H8l-4 3.5v-3.5H4v-14z" />,
  },
  PROCEDURE: {
    label: "Procedure",
    icon: <path d="M12 3l7 3.2v5.3c0 4.3-2.9 7.9-7 9-4.1-1.1-7-4.7-7-9V6.2L12 3z" />,
  },
  IMAGING: {
    label: "Imaging",
    icon: (
      <>
        <rect x="3.5" y="5" width="17" height="14" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="M20.5 16l-5-4-3.5 3-2-1.5-6.5 5.5" />
      </>
    ),
  },
  VACCINATION: {
    label: "Vaccination",
    icon: <path d="M18 4l2 2-2 2 1.5 1.5-9 9-3-3 9-9L18 4zM4 20l3-1 1-3" />,
  },
  DOCUMENT: {
    label: "Document",
    icon: (
      <>
        <path d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1Z" />
        <path d="M9 12h6M9 15.5h6M9 8.5h2" />
      </>
    ),
  },
};

export function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const meta = TYPE_META[event.type];
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteReport = useDeleteReport();
  const deleteMedicine = useDeleteMedicine();
  const deleteTimelineEvent = useDeleteTimelineEvent();
  const isReport = event.type === "LAB_REPORT";

  // Every entry can be removed — which mutation runs depends on what backs
  // it: a report/medicine entry deletes that whole record (so it also
  // disappears from Reports/Health or Medicines, not just this list); any
  // other entry falls back to deleting just the timeline card itself.
  const deleteMutation = event.relatedReportId
    ? deleteReport
    : event.relatedMedicineId
      ? deleteMedicine
      : deleteTimelineEvent;

  const deleteTarget = event.relatedReportId ?? event.relatedMedicineId ?? event.id;

  const confirmCopy = event.relatedReportId
    ? `Removes "${event.title}" and its results everywhere — Reports, Health, and this Timeline. Anything already shared stops updating too. This can't be undone.`
    : event.relatedMedicineId
      ? `Removes "${event.title}" from your medicines and this timeline. This can't be undone.`
      : `Removes "${event.title}" from your timeline. This can't be undone.`;

  function handleConfirmDelete() {
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => setConfirmOpen(false),
    });
  }

  const cardInner = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
        {meta.label} · {formatDate(event.occurredAt)}
      </p>
      <p className="font-display mt-1 text-[15px] font-medium text-[var(--color-text)]">{event.title}</p>
      {event.description ? (
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{event.description}</p>
      ) : null}
    </>
  );

  return (
    <div className="group flex gap-4">
      <div className="flex flex-col items-center">
        <span
          aria-hidden="true"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            isReport
              ? "bg-[var(--color-brand)] text-[var(--color-accent-bright)]"
              : "border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-brand)]",
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            {meta.icon}
          </svg>
        </span>
        {!isLast ? <span aria-hidden="true" className="mt-1 w-px flex-1 bg-[var(--color-border-strong)]" /> : null}
      </div>

      <div className="relative mb-6 flex-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm transition-colors duration-150 group-hover:border-[var(--color-border-strong)]">
        {event.relatedReportId ? (
          <Link href={`/reports/${event.relatedReportId}`} className="block hover:opacity-80">
            {cardInner}
          </Link>
        ) : (
          cardInner
        )}
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          aria-label={`Delete ${event.title}`}
          className="absolute top-4 right-4 flex h-7.5 w-7.5 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-faint)] opacity-100 transition-all duration-150 hover:border-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-8 0l1 13a2 2 0 002 2h4a2 2 0 002-2l1-13" />
          </svg>
        </button>
      </div>

      {confirmOpen ? (
        <ConfirmDialog
          title={`Delete this ${meta.label.toLowerCase()}?`}
          description={confirmCopy}
          confirmLabel="Delete"
          isLoading={deleteMutation.isPending}
          error={deleteMutation.error instanceof ApiError ? deleteMutation.error.message : null}
          onConfirm={handleConfirmDelete}
          onClose={() => setConfirmOpen(false)}
        />
      ) : null}
    </div>
  );
}
