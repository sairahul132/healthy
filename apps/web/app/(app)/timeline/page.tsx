"use client";

import { useState } from "react";
import { useTimelineEvents } from "@/lib/reports/hooks";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { TimelineItem } from "@/components/timeline/TimelineItem";
import { HistoryList } from "@/components/timeline/HistoryList";
import { RequireReports } from "@/components/reports/RequireReports";
import { cn } from "@/lib/utils/cn";

function TimelineEvents() {
  const { data: events, isLoading, isError, refetch } = useTimelineEvents();

  return (
    <>
      {isLoading ? <LoadingState label="Loading your timeline…" /> : null}
      {isError ? (
        <ErrorState
          description="We couldn't load your timeline."
          action={
            <Button size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      ) : null}
      {events && events.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Upload a report or log an event to start building your health timeline."
        />
      ) : null}
      {events && events.length > 0 ? (
        <div className="max-w-3xl">
          {events.map((event, index) => (
            <TimelineItem key={event.id} event={event} isLast={index === events.length - 1} />
          ))}
        </div>
      ) : null}
    </>
  );
}

const TABS = [
  { key: "timeline", label: "Timeline" },
  { key: "history", label: "History" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function TimelinePage() {
  const [tab, setTab] = useState<TabKey>("timeline");

  return (
    <div>
      <span className="text-[10.5px] font-bold tracking-[0.14em] text-[var(--color-accent)] uppercase">
        Every report, visit, and event
      </span>
      <h1 className="mt-1 font-display text-2xl font-medium text-[var(--color-text)]">Timeline</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        {tab === "timeline"
          ? "Your whole health history in one chronological view. Every card has a delete option — on a report or medicine, deleting here removes it everywhere."
          : "A log of every report and medicine you've added, edited, or removed."}
      </p>

      <div className="mt-6 flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-[var(--color-brand)] text-[var(--color-brand-foreground)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-7">
        {tab === "timeline" ? (
          <RequireReports description="Please upload reports to build your health timeline.">
            <TimelineEvents />
          </RequireReports>
        ) : (
          <HistoryList />
        )}
      </div>
    </div>
  );
}
