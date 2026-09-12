"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useHasReports } from "@/lib/reports/hooks";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";

interface RequireReportsProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
}

/**
 * Gates a page's real functionality behind having at least one uploaded
 * report. Nothing in `children` mounts (so no data hooks inside it fire)
 * until the user has a report — instead this renders a plain "upload a
 * report first" message, consistently across every page that depends on
 * report data.
 */
export function RequireReports({
  children,
  title = "Reports are not available",
  description = "Please upload reports to use this feature.",
  actionLabel = "Upload report",
}: RequireReportsProps) {
  const { hasReports, isLoading, isError, refetch } = useHasReports();

  if (isLoading) return <LoadingState label="Checking your reports…" />;

  if (isError) {
    return (
      <ErrorState
        description="We couldn't load your reports."
        action={
          <Button size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!hasReports) {
    return (
      <EmptyState
        title={title}
        description={description}
        action={
          <Link href="/reports/upload">
            <Button size="sm">{actionLabel}</Button>
          </Link>
        }
      />
    );
  }

  return <>{children}</>;
}
