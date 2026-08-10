"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import * as sharingApi from "@/lib/api/sharing";
import type { HealthCategoryId } from "@/lib/api/types";
import { ApiError } from "@/lib/api/types";
import { Button } from "@/components/ui/Button";

export function RequestAccessForm({
  token,
  accessToken,
  category,
  onDone,
}: {
  token: string;
  accessToken: string;
  category: HealthCategoryId;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [durationHours, setDurationHours] = useState(24);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      sharingApi.createAccessRequest(token, accessToken, {
        category,
        reason,
        requestedDurationHours: durationHours,
      }),
    onSuccess: onDone,
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Couldn't send the request.");
    },
  });

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-[var(--color-border)] pt-3">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for requesting access…"
        rows={2}
        disabled={mutation.isPending}
        className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] shadow-sm"
      />
      <div className="flex items-center gap-2">
        <select
          value={durationHours}
          onChange={(e) => setDurationHours(Number(e.target.value))}
          disabled={mutation.isPending}
          className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text)]"
        >
          <option value={24}>24 hours</option>
          <option value={168}>7 days</option>
          <option value={720}>30 days</option>
        </select>
        <Button
          type="button"
          size="sm"
          isLoading={mutation.isPending}
          disabled={!reason.trim()}
          onClick={() => {
            setError(null);
            mutation.mutate();
          }}
        >
          Send request
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-xs font-medium text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
