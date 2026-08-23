"use client";

import { useExplainResult } from "@/lib/ai/hooks";
import { ApiError } from "@/lib/api/types";
import { ErrorState, LoadingState } from "@/components/ui/States";

export function ExplainPanel({ resultId }: { resultId: string }) {
  const { data, isLoading, isError, error } = useExplainResult(resultId, true);

  if (isLoading) return <LoadingState label="Asking Ask Healthy…" />;
  if (isError || !data) {
    return (
      <ErrorState
        title="Couldn't generate an explanation"
        description={error instanceof ApiError ? error.message : "Please try again."}
      />
    );
  }

  return (
    <div className="mt-2 rounded-xl bg-[var(--color-surface-muted)] p-3">
      <p className="whitespace-pre-wrap text-sm text-[var(--color-text)]">{data.explanation}</p>
    </div>
  );
}
