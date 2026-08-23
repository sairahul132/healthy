"use client";

import Link from "next/link";
import { useHealthCategories } from "@/lib/health/hooks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";

export default function HealthPage() {
  const { data: categories, isLoading, isError, refetch } = useHealthCategories();

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-[var(--color-text)]">Health</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Your results, organized by body system (docs/SPEC.md §21/§145).
      </p>

      <div className="mt-7">
        {isLoading ? <LoadingState label="Loading categories…" /> : null}
        {isError ? (
          <ErrorState
            description="We couldn't load health categories."
            action={
              <Button size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        ) : null}
        {categories ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {categories.map((category) => (
              <Link key={category.id} href={`/health/${category.id}`} className="block focus-visible:outline-none">
                <Card className="flex flex-col items-center gap-2 p-5 text-center transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--color-brand)]/30 hover:shadow-md">
                  <span aria-hidden="true" className="text-2xl">
                    {category.icon}
                  </span>
                  <span className="text-sm font-medium text-[var(--color-text)]">{category.label}</span>
                </Card>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
