"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/types";
import { useClearHistory, useTimelineHistory } from "@/lib/reports/hooks";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatDateTime } from "@/lib/utils/format";

const EVENT_TONE: Record<string, string> = {
  REPORT_UPLOADED: "bg-[var(--status-green-tint)] text-[var(--status-green)]",
  REPORT_DELETED: "bg-[var(--status-red-tint)] text-[var(--status-red)]",
  MEDICINE_CREATED: "bg-[var(--status-green-tint)] text-[var(--status-green)]",
  MEDICINE_UPDATED: "bg-[var(--status-yellow-tint)] text-[var(--status-yellow)]",
  MEDICINE_DELETED: "bg-[var(--status-red-tint)] text-[var(--status-red)]",
};

/** A plain-language read of the append-only activity log (§55) — every
 * report/medicine add, edit, and delete, newest first. "Clear" only moves
 * this user's visibility cutoff forward (see ReportsService.clear_history);
 * the underlying audit rows are never touched. */
export function HistoryList() {
  const { data: entries, isLoading, isError, refetch } = useTimelineHistory();
  const clearHistory = useClearHistory();
  const [confirmClear, setConfirmClear] = useState(false);

  if (isLoading) return <LoadingState label="Loading your activity history…" />;
  if (isError) {
    return (
      <ErrorState
        description="We couldn't load your activity history."
        action={
          <Button size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div>
      {entries && entries.length > 0 ? (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
          >
            Clear history
          </button>
        </div>
      ) : null}

      {entries && entries.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Reports and medicines you add, edit, or remove will show up here as a log."
        />
      ) : null}

      {entries && entries.length > 0 ? (
        <div className="max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className={
                index < entries.length - 1
                  ? "flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-3.5"
                  : "flex items-center justify-between gap-3 px-5 py-3.5"
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold whitespace-nowrap ${
                    EVENT_TONE[entry.eventType] ?? "bg-[var(--status-neutral-tint)] text-[var(--status-neutral)]"
                  }`}
                >
                  {entry.title}
                </span>
                {entry.description ? (
                  <p className="truncate text-sm text-[var(--color-text)]">{entry.description}</p>
                ) : null}
              </div>
              <p className="shrink-0 text-xs text-[var(--color-text-faint)]">
                {formatDateTime(entry.occurredAt)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {confirmClear ? (
        <ConfirmDialog
          title="Clear activity history?"
          description="This clears the log itself — it does not delete any reports or medicines. This can't be undone."
          confirmLabel="Clear history"
          isLoading={clearHistory.isPending}
          error={clearHistory.error instanceof ApiError ? clearHistory.error.message : null}
          onConfirm={() => clearHistory.mutate(undefined, { onSuccess: () => setConfirmClear(false) })}
          onClose={() => setConfirmClear(false)}
        />
      ) : null}
    </div>
  );
}
