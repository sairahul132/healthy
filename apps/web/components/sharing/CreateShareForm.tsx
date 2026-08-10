"use client";

import { useState } from "react";
import type { HealthCategoryId, SharingSession } from "@/lib/api/types";
import { ApiError } from "@/lib/api/types";
import { identifierSchema } from "@/lib/validation/auth";
import { useCreateSharingSession } from "@/lib/sharing/hooks";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { CategoryPicker } from "./CategoryPicker";
import { ShareLinkPanel } from "./ShareLinkPanel";

const DURATION_OPTIONS = [
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 24 * 7 },
  { label: "30 days", hours: 24 * 30 },
];

export function CreateShareForm() {
  const [categories, setCategories] = useState<HealthCategoryId[]>([]);
  const [identifier, setIdentifier] = useState("");
  const [durationHours, setDurationHours] = useState(24);
  const [customHours, setCustomHours] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<SharingSession | null>(null);

  const mutation = useCreateSharingSession();

  const effectiveDuration = isCustom ? Number(customHours) : durationHours;

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
    if (!Number.isFinite(effectiveDuration) || effectiveDuration < 1) {
      setError("Enter a valid duration.");
      return;
    }

    try {
      const session = await mutation.mutateAsync({
        categoryIds: categories,
        recipientIdentifier: parsedIdentifier.data,
        durationHours: Math.round(effectiveDuration),
      });
      setCreatedSession(session);
      setCategories([]);
      setIdentifier("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the share. Try again.");
    }
  }

  if (createdSession) {
    return <ShareLinkPanel session={createdSession} onDone={() => setCreatedSession(null)} />;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
          What to share
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
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.hours}
              type="button"
              disabled={mutation.isPending}
              onClick={() => {
                setIsCustom(false);
                setDurationHours(option.hours);
              }}
              className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                !isCustom && durationHours === option.hours
                  ? "border-[var(--color-brand)] bg-[var(--color-brand-tint)] text-[var(--color-brand)]"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => setIsCustom(true)}
            className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              isCustom
                ? "border-[var(--color-brand)] bg-[var(--color-brand-tint)] text-[var(--color-brand)]"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            Custom
          </button>
        </div>
        {isCustom ? (
          <input
            type="number"
            min={1}
            placeholder="Hours"
            value={customHours}
            onChange={(e) => setCustomHours(e.target.value)}
            disabled={mutation.isPending}
            className="mt-2 w-32 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] shadow-sm"
          />
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      <div>
        <Button type="submit" isLoading={mutation.isPending}>
          Generate secure link
        </Button>
      </div>
    </form>
  );
}
