"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as sharingApi from "@/lib/api/sharing";
import type { HealthCategoryId } from "@/lib/api/types";
import { getCategory } from "@/lib/health/categories";
import { formatDateTime } from "@/lib/utils/format";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { RequestAccessForm } from "./RequestAccessForm";

export function CategoriesStep({ token, accessToken }: { token: string; accessToken: string }) {
  const [requestingCategory, setRequestingCategory] = useState<HealthCategoryId | null>(null);
  const [sentFor, setSentFor] = useState<Set<HealthCategoryId>>(new Set());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["share-categories", token],
    queryFn: () => sharingApi.getShareCategories(token, accessToken),
  });

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
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-text-faint)]">
                Healthify ID
              </p>
              <p className="font-display mt-1 text-xl font-medium text-[var(--color-text)]">
                {data.healthifyId}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-faint)]">
                Access expires {formatDateTime(data.expiresAt)}
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.categories.map((entry) => {
                  const category = getCategory(entry.id);
                  const hasSentRequest = sentFor.has(entry.id);

                  if (entry.authorized) {
                    return (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-[var(--status-green)]/25 bg-[var(--status-green-tint)] p-4"
                      >
                        <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text)]">
                          <span aria-hidden="true">{category.icon}</span>
                          {category.label}
                        </p>
                        <p className="mt-1 text-xs font-medium text-[var(--status-green)]">
                          Available
                        </p>
                        <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
                          {data.dataNote}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] p-4"
                    >
                      <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-faint)]">
                        <span aria-hidden="true">{category.icon}</span>
                        {category.label}
                      </p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
                        Locked · Restricted by patient
                      </p>

                      {hasSentRequest ? (
                        <p className="mt-2 text-xs font-medium text-[var(--color-brand)]">
                          Request sent — waiting for approval.
                        </p>
                      ) : requestingCategory === entry.id ? (
                        <RequestAccessForm
                          token={token}
                          accessToken={accessToken}
                          category={entry.id}
                          onDone={() => {
                            setSentFor((prev) => new Set(prev).add(entry.id));
                            setRequestingCategory(null);
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRequestingCategory(entry.id)}
                          className="mt-2 text-xs font-medium text-[var(--color-brand)] hover:underline"
                        >
                          Request access
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
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
