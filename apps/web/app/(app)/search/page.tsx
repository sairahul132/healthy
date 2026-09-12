"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearch } from "@/lib/search/hooks";
import { Card } from "@/components/ui/Card";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { RequireReports } from "@/components/reports/RequireReports";

function SearchBox() {
  const [query, setQuery] = useState("");
  const { data: results, isLoading, isFetching } = useSearch(query);

  return (
    <>
      <input
        autoFocus
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search for “cholesterol”, “hemoglobin”, a report name…"
        className="w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-brand)]"
      />

      <div className="mt-6">
        {query.trim().length < 2 ? (
          <p className="text-sm text-[var(--color-text-faint)]">Type at least 2 characters to search.</p>
        ) : null}
        {(isLoading || isFetching) && query.trim().length >= 2 ? <LoadingState label="Searching…" /> : null}
        {results && results.length === 0 && query.trim().length >= 2 ? (
          <EmptyState title="No matches" description={`Nothing found for "${query}".`} />
        ) : null}
        {results && results.length > 0 ? (
          <div className="flex flex-col gap-2">
            {results.map((result) => (
              <Link key={`${result.kind}-${result.id}`} href={`/reports/${result.relatedReportId}`}>
                <Card className="flex items-center justify-between gap-3 p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--color-brand)]/30 hover:shadow-md">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{result.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{result.subtitle}</p>
                  </div>
                  <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                    {result.kind === "report" ? "Report" : "Result"}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-[var(--color-text)]">Search</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Find a test, result, or report across your whole vault (docs/SPEC.md §62).
      </p>

      <div className="mt-6">
        <RequireReports description="Please upload reports to search your vault.">
          <SearchBox />
        </RequireReports>
      </div>
    </div>
  );
}
