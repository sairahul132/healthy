"use client";

import { useTimelineEvents } from "@/lib/reports/hooks";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { TimelineItem } from "@/components/timeline/TimelineItem";

export default function TimelinePage() {
  const { data: events, isLoading, isError, refetch } = useTimelineEvents();

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-[var(--color-text)]">Timeline</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Every report, visit, and event in your health history, in one chronological view.
      </p>

      <div className="mt-7">
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
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-5 shadow-sm">
            {events.map((event, index) => (
              <TimelineItem key={event.id} event={event} isLast={index === events.length - 1} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
