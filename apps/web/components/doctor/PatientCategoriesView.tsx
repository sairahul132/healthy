"use client";

import Link from "next/link";
import type { HealthCategoryId } from "@/lib/api/types";
import { useDoctorPatientCategories, useDoctorPatientCategoryResults } from "@/lib/doctor/hooks";
import { getCategory } from "@/lib/health/categories";
import { formatDateTime } from "@/lib/utils/format";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { ResultRow } from "@/components/reports/ResultRow";

function CategoryResults({ sessionId, category }: { sessionId: string; category: HealthCategoryId }) {
  const { data: results, isLoading } = useDoctorPatientCategoryResults(sessionId, category);
  if (isLoading) return <LoadingState label="Loading results…" />;
  if (!results || results.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)]">No results extracted yet.</p>;
  }
  return (
    <div className="mt-2 rounded-lg bg-[var(--color-surface)] px-3">
      {results.map((result) => (
        <ResultRow key={result.id} result={result} />
      ))}
    </div>
  );
}

export function PatientCategoriesView({ sessionId }: { sessionId: string }) {
  const { data, isLoading, isError, refetch } = useDoctorPatientCategories(sessionId);

  if (isLoading) return <LoadingState label="Loading patient…" />;
  if (isError || !data) {
    return (
      <ErrorState
        title="Not found"
        description="This patient session doesn't exist, or isn't linked to your account."
        action={
          <button onClick={() => refetch()} className="text-sm font-medium text-[var(--color-brand)]">
            Retry
          </button>
        }
      />
    );
  }

  return (
    <div>
      <Link href="/doctor" className="text-sm text-[var(--color-text-muted)] hover:underline">
        ← Back to patients
      </Link>

      <p className="mt-4 text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-text-faint)]">
        Healthy ID
      </p>
      <p className="font-display mt-1 text-xl font-medium text-[var(--color-text)]">{data.healthyId}</p>
      <p className="mt-1 text-xs text-[var(--color-text-faint)]">
        Access expires {formatDateTime(data.expiresAt)}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data.categories.map((entry) => {
          const category = getCategory(entry.id);
          if (!entry.authorized) {
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
              </div>
            );
          }
          return (
            <div
              key={entry.id}
              className="rounded-xl border border-[var(--status-green)]/25 bg-[var(--status-green-tint)] p-4"
            >
              <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text)]">
                <span aria-hidden="true">{category.icon}</span>
                {category.label}
              </p>
              <p className="mt-1 text-xs font-medium text-[var(--status-green)]">Available</p>
              <CategoryResults sessionId={sessionId} category={entry.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
