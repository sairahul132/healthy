"use client";

import { useState } from "react";
import type { HealthCategoryId } from "@/lib/api/types";
import { useHealthCategories, useHealthTrends } from "@/lib/health/hooks";
import { HEALTH_CATEGORIES } from "@/lib/health/categories";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { CategoryIcon } from "@/components/health/CategoryIcon";
import { CategorySection } from "@/components/health/CategorySection";
import { cn } from "@/lib/utils/cn";

const TOTAL_CATEGORY_COUNT = Object.keys(HEALTH_CATEGORIES).length;

/** The Health page's content — a category filter plus every test's latest
 * result, grouped by body system. Only categories the user actually has a
 * result in are ever shown (see `useHealthCategories`, which now filters
 * server-side) — no empty tiles for organs nothing has been tested for.
 *
 * `initialCategory` seeds the filter for the `/health/[id]` deep link
 * (e.g. from a report's category pill); the filter itself still lives on
 * this one page rather than a separate route per category, since the
 * point of the redesign is seeing everything at a glance. */
export function HealthOverview({ initialCategory }: { initialCategory?: HealthCategoryId }) {
  const { data: categories, isLoading, isError, refetch } = useHealthCategories();
  const { data: trends } = useHealthTrends();
  const [selected, setSelected] = useState<HealthCategoryId | "all">(initialCategory ?? "all");

  if (isLoading) return <LoadingState label="Loading your health categories…" />;
  if (isError) {
    return (
      <ErrorState
        description="We couldn't load your health categories."
        action={
          <Button size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }
  if (!categories || categories.length === 0) {
    return (
      <EmptyState
        title="Nothing here yet"
        description="Upload a report to see your results organized by body system."
      />
    );
  }

  const visible = selected === "all" ? categories : categories.filter((c) => c.id === selected);

  const hiddenCount = TOTAL_CATEGORY_COUNT - categories.length;
  const hiddenSample = Object.values(HEALTH_CATEGORIES)
    .filter((c) => !categories.some((present) => present.id === c.id))
    .slice(0, 3)
    .map((c) => c.label);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelected("all")}
          className={cn(
            "rounded-full border px-[15px] py-2 text-[13px] font-medium transition-colors",
            selected === "all"
              ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-brand-foreground)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]",
          )}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setSelected(category.id)}
            className={cn(
              "flex items-center gap-[7px] rounded-full border px-[15px] py-2 text-[13px] font-medium transition-colors",
              selected === category.id
                ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-brand-foreground)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]",
            )}
          >
            <CategoryIcon id={category.id} className="h-3.5 w-3.5" />
            {category.label}
          </button>
        ))}
        {hiddenCount > 0 ? (
          <span className="ml-1 self-center text-xs text-[var(--color-text-faint)]">
            Only categories with results are shown — {hiddenCount} more ({hiddenSample.join(", ")}
            …) will appear once you&rsquo;ve been tested.
          </span>
        ) : null}
      </div>

      <div className="mt-[30px]">
        {visible.map((category) => (
          <CategorySection
            key={category.id}
            categoryId={category.id}
            label={category.label}
            trends={trends ?? []}
          />
        ))}
      </div>
    </div>
  );
}
