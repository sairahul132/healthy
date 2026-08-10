"use client";

import { useState } from "react";
import type { SharingSession } from "@/lib/api/types";
import { getCategory } from "@/lib/health/categories";
import { formatDate } from "@/lib/utils/format";
import { useRevokeSharingSession, useSharingSessions } from "@/lib/sharing/hooks";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";

const STATUS_STYLE: Record<SharingSession["status"], string> = {
  active: "text-[var(--status-green)] bg-[var(--status-green-tint)]",
  expired: "text-[var(--status-neutral)] bg-[var(--status-neutral-tint)]",
  revoked: "text-[var(--color-danger)] bg-[var(--color-danger-tint)]",
};

function SessionRow({ session }: { session: SharingSession }) {
  const revokeMutation = useRevokeSharingSession();
  const [confirming, setConfirming] = useState(false);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {session.recipientIdentifierMasked}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {session.status === "revoked"
              ? "Revoked"
              : session.status === "expired"
                ? `Expired ${formatDate(session.expiresAt)}`
                : `Expires ${formatDate(session.expiresAt)}`}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLE[session.status]}`}
        >
          {session.status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {session.categoryIds.map((id) => {
          const category = getCategory(id);
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]"
            >
              <span aria-hidden="true">{category.icon}</span>
              {category.label}
            </span>
          );
        })}
      </div>

      {session.status === "active" ? (
        <div className="mt-4">
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">Revoke this share?</span>
              <Button
                type="button"
                size="sm"
                variant="danger"
                isLoading={revokeMutation.isPending}
                onClick={() => revokeMutation.mutate(session.id, { onSettled: () => setConfirming(false) })}
              >
                Yes, revoke
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button type="button" size="sm" variant="secondary" onClick={() => setConfirming(true)}>
              Revoke access
            </Button>
          )}
        </div>
      ) : null}
    </Card>
  );
}

export function ActiveShares() {
  const { data: sessions, isLoading, isError, refetch } = useSharingSessions();

  if (isLoading) return <LoadingState label="Loading your shares…" />;
  if (isError) {
    return (
      <ErrorState
        description="We couldn't load your shares."
        action={
          <Button size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }
  if (!sessions || sessions.length === 0) {
    return (
      <EmptyState
        title="Nothing shared yet"
        description="Shares you create will show up here, with the ability to revoke access at any time."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sessions.map((session) => (
        <SessionRow key={session.id} session={session} />
      ))}
    </div>
  );
}
