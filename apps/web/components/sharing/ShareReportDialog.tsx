"use client";

import { useEffect, useState } from "react";
import type { HealthCategoryId, SharingSession } from "@/lib/api/types";
import { ApiError } from "@/lib/api/types";
import { identifierSchema } from "@/lib/validation/auth";
import { useCreateSharingSession } from "@/lib/sharing/hooks";
import { Button } from "@/components/ui/Button";
import { DurationPicker } from "@/components/ui/DurationPicker";
import { Field } from "@/components/ui/Field";
import { CategoryPicker } from "./CategoryPicker";
import { ShareLinkPanel } from "./ShareLinkPanel";

/** Share flow scoped to one report's categories — opened from the report
 * detail page's Share button, prefilled with that report's own categories
 * (still editable) instead of starting from an empty picker. Reuses the
 * same creation endpoint/hook as the full /share page's CreateShareForm. */
export function ShareReportDialog({
  reportName,
  categoryIds,
  onClose,
}: {
  reportName: string;
  categoryIds: HealthCategoryId[];
  onClose: () => void;
}) {
  const [categories, setCategories] = useState<HealthCategoryId[]>(categoryIds);
  const [identifier, setIdentifier] = useState("");
  const [durationHours, setDurationHours] = useState(24);
  const [error, setError] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<SharingSession | null>(null);
  const mutation = useCreateSharingSession();

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (categories.length === 0) {
      setError("Select at least one category to share.");
      return;
    }
    const parsedIdentifier = identifierSchema.safeParse(identifier);
    if (!parsedIdentifier.success) {
      setError(parsedIdentifier.error.issues[0]?.message ?? "Enter a valid recipient.");
      return;
    }
    if (!Number.isFinite(durationHours) || durationHours < 1) {
      setError("Enter a valid duration.");
      return;
    }

    try {
      const session = await mutation.mutateAsync({
        categoryIds: categories,
        recipientIdentifier: parsedIdentifier.data,
        durationHours: Math.round(durationHours),
      });
      setCreatedSession(session);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the share. Try again.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Share ${reportName}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-medium text-[var(--color-text)]">
              Share this report
            </h2>
            <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{reportName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-[var(--color-text-faint)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {createdSession ? (
          <div className="mt-5">
            <ShareLinkPanel session={createdSession} onDone={onClose} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                Categories included
              </label>
              <CategoryPicker selected={categories} onChange={setCategories} disabled={mutation.isPending} />
            </div>

            <Field
              label="Share with"
              placeholder="Doctor's phone number or email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={mutation.isPending}
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                Access expires after
              </label>
              <DurationPicker value={durationHours} onChange={setDurationHours} disabled={mutation.isPending} />
            </div>

            {error ? (
              <p role="alert" className="text-sm font-medium text-[var(--color-danger)]">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" isLoading={mutation.isPending}>
                Generate secure link
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
