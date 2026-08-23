"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as sharingApi from "@/lib/api/sharing";
import type { HealthCategoryId, ShareCategoryStatus } from "@/lib/api/types";
import { getCategory } from "@/lib/health/categories";
import { formatDateTime } from "@/lib/utils/format";
import { Logo } from "@/components/layout/Logo";
import { Icon } from "@/components/layout/icons";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { ResultRow } from "@/components/reports/ResultRow";
import { RequestAccessForm } from "./RequestAccessForm";

function AvailableCategoryCard({
  token,
  accessToken,
  entry,
}: {
  token: string;
  accessToken: string;
  entry: ShareCategoryStatus;
}) {
  const category = getCategory(entry.id);
  const { data: results, isLoading } = useQuery({
    queryKey: ["share-category-results", token, entry.id],
    queryFn: () => sharingApi.getShareCategoryResults(token, accessToken, entry.id),
  });

  return (
    <div className="rounded-2xl border border-[var(--status-green)]/25 bg-[var(--status-green-tint)] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
          <span aria-hidden="true" className="text-base">
            {category.icon}
          </span>
          {category.label}
        </p>
        <span className="rounded-full bg-[var(--status-green)]/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--status-green)]">
          Available
        </span>
      </div>

      {isLoading ? (
        <LoadingState label="Loading results…" />
      ) : !results || results.length === 0 ? (
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          No results extracted for this category yet.
        </p>
      ) : (
        <div className="mt-3 rounded-xl bg-[var(--color-surface)] px-4">
          {results.map((result) => (
            <ResultRow key={result.id} result={result} allowExplain={false} />
          ))}
        </div>
      )}
    </div>
  );
}

function LockedCategoryCard({
  token,
  accessToken,
  entry,
  requesting,
  sent,
  onRequest,
  onSent,
}: {
  token: string;
  accessToken: string;
  entry: ShareCategoryStatus;
  requesting: boolean;
  sent: boolean;
  onRequest: () => void;
  onSent: () => void;
}) {
  const category = getCategory(entry.id);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
        <span aria-hidden="true">{category.icon}</span>
        {category.label}
      </p>
      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
        <Icon name="permissions" width={12} height={12} className="shrink-0" />
        Restricted by patient
      </p>

      <div className="mt-3">
        {sent ? (
          <p className="text-xs font-medium text-[var(--color-brand)]">
            Request sent — waiting for approval.
          </p>
        ) : requesting ? (
          <RequestAccessForm token={token} accessToken={accessToken} category={entry.id} onDone={onSent} />
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={onRequest}>
            Request access
          </Button>
        )}
      </div>
    </div>
  );
}

export function CategoriesStep({ token, accessToken }: { token: string; accessToken: string }) {
  const [requestingCategory, setRequestingCategory] = useState<HealthCategoryId | null>(null);
  const [sentFor, setSentFor] = useState<Set<HealthCategoryId>>(new Set());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["share-categories", token],
    queryFn: () => sharingApi.getShareCategories(token, accessToken),
  });

  // Background poll for a live "did the patient approve my request yet?"
  // signal, without re-fetching (and re-auditing as a "view") the full
  // categories payload on every tick — see lib/api/sharing.ts's
  // getShareStatus. Only starts once the initial view has loaded.
  const { data: status } = useQuery({
    queryKey: ["share-status", token],
    queryFn: () => sharingApi.getShareStatus(token, accessToken),
    enabled: Boolean(data),
    refetchInterval: 5000,
  });

  // A real change (a category the last full fetch didn't have as
  // authorized) triggers exactly one genuine refetch — the page updates in
  // place, no re-verification or "logout" involved, since this never
  // touches the recipient's access token/session.
  useEffect(() => {
    if (!data || !status) return;
    const known = new Set(data.categories.filter((c) => c.authorized).map((c) => c.id));
    if (status.categoryIds.some((id) => !known.has(id))) refetch();
  }, [status, data, refetch]);

  // A category that becomes authorized is filtered out of `locked` below and
  // rendered under "Shared with you" instead, so a stale `sentFor` entry for
  // it is harmless — nothing re-reads sentFor once a category isn't locked.
  const authorized = data?.categories.filter((c) => c.authorized) ?? [];
  const locked = data?.categories.filter((c) => !c.authorized) ?? [];

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <span className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1 text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
            Confidential
          </span>
        </div>

        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-lg">
          {isLoading ? <LoadingState label="Loading authorized categories…" /> : null}
          {isError ? (
            <ErrorState
              description="Your session may have expired. Reopen the share link to verify again."
              action={
                <Button size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              }
            />
          ) : null}

          {data ? (
            <>
              <div className="border-b border-[var(--color-border)] pb-6">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-text-faint)]">
                  Healthy ID
                </p>
                <p className="font-display mt-1 text-xl font-medium text-[var(--color-text)]">
                  {data.healthyId}
                </p>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  You&apos;ve been granted secure, time-limited access to the health categories
                  below. {data.dataNote}
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-text-faint)]">
                  <Icon name="timeline" width={14} height={14} className="shrink-0" />
                  Access expires {formatDateTime(data.expiresAt)}
                </p>
              </div>

              {authorized.length > 0 ? (
                <div className="mt-6">
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Shared with you
                  </h2>
                  <div className="flex flex-col gap-3">
                    {authorized.map((entry) => (
                      <AvailableCategoryCard
                        key={entry.id}
                        token={token}
                        accessToken={accessToken}
                        entry={entry}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {locked.length > 0 ? (
                <div className="mt-8">
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Not shared
                  </h2>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {locked.map((entry) => (
                      <LockedCategoryCard
                        key={entry.id}
                        token={token}
                        accessToken={accessToken}
                        entry={entry}
                        requesting={requestingCategory === entry.id}
                        sent={sentFor.has(entry.id)}
                        onRequest={() => setRequestingCategory(entry.id)}
                        onSent={() => {
                          setSentFor((prev) => new Set(prev).add(entry.id));
                          setRequestingCategory(null);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <p className="mx-auto mt-6 max-w-md text-center text-xs text-[var(--color-text-faint)]">
          This view is logged. Screenshots and downloads aren&apos;t prevented by the browser, but
          every access to this share is recorded in the patient&apos;s audit history.
        </p>
      </div>
    </main>
  );
}
