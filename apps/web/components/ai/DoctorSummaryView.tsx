"use client";

import { useDoctorSummary } from "@/lib/ai/hooks";
import { ApiError } from "@/lib/api/types";
import { formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function DoctorSummaryView() {
  const summary = useDoctorSummary();

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-[var(--color-text)]">
        Doctor visit summary
      </h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        A short summary of your recent notable results and active medicines, ready to bring to
        your next appointment.
      </p>

      {!summary.isSuccess ? (
        <div className="mt-6">
          <Button isLoading={summary.isPending} onClick={() => summary.mutate()}>
            Generate summary
          </Button>
          {summary.isError ? (
            <p className="mt-2 text-sm text-[var(--color-danger)]">
              {summary.error instanceof ApiError
                ? summary.error.message
                : "Couldn't generate a summary. Please try again."}
            </p>
          ) : null}
        </div>
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              {formatDate(summary.data.windowStart)} – {formatDate(summary.data.windowEnd)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-[var(--color-text)]">
              {summary.data.narrative}
            </p>
            <Button
              className="mt-4"
              variant="secondary"
              size="sm"
              isLoading={summary.isPending}
              onClick={() => summary.mutate()}
            >
              Regenerate
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
