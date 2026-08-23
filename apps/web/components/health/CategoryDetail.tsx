"use client";

import Link from "next/link";
import { useHealthCategoryDetail, useHealthTrends } from "@/lib/health/hooks";
import { formatDate } from "@/lib/utils/format";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TrendChart } from "./TrendChart";

export function CategoryDetail({ categoryId }: { categoryId: string }) {
  const { data: category, isLoading, isError } = useHealthCategoryDetail(categoryId);
  const { data: trends } = useHealthTrends();

  if (isLoading) return <LoadingState label="Loading…" />;
  if (isError || !category) {
    return <ErrorState title="Category not found" description="That health category doesn't exist." />;
  }

  return (
    <div>
      <Link href="/health" className="text-sm text-[var(--color-text-muted)] hover:underline">
        ← Back to Health
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span aria-hidden="true" className="text-3xl">
          {category.icon}
        </span>
        <h1 className="font-display text-2xl font-medium text-[var(--color-text)]">{category.label}</h1>
      </div>

      {category.latestResults.length === 0 ? (
        <div className="mt-7">
          <EmptyState
            title="No results yet"
            description={`Upload a report with ${category.label.toLowerCase()} tests to see them here.`}
          />
        </div>
      ) : (
        <div className="mt-7 flex flex-col gap-4">
          {category.latestResults.map((result) => {
            const trend = trends?.find((t) => t.canonicalTestName === result.canonicalTestName);
            return (
              <Card key={result.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-[15px] font-medium text-[var(--color-text)]">
                      {result.canonicalTestName}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {result.value} {result.unit} · Reference: {result.referenceText}
                      {result.collectionDate ? ` · ${formatDate(result.collectionDate)}` : ""}
                    </p>
                  </div>
                  <StatusBadge severity={result.status.severity} label={result.status.label} />
                </div>
                {trend && trend.points.length >= 2 ? (
                  <div className="mt-4">
                    <TrendChart points={trend.points} unit={trend.unit} />
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
