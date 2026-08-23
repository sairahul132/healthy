"use client";

import { useState } from "react";
import type { HealthCategoryId, PermissionRole, SharingSession } from "@/lib/api/types";
import { ApiError } from "@/lib/api/types";
import { identifierSchema } from "@/lib/validation/auth";
import { useCreateSharingSession } from "@/lib/sharing/hooks";
import { Button } from "@/components/ui/Button";
import { DurationPicker } from "@/components/ui/DurationPicker";
import { Field } from "@/components/ui/Field";
import { RolePicker } from "@/components/permissions/RolePicker";
import { CategoryPicker } from "./CategoryPicker";
import { ShareLinkPanel } from "./ShareLinkPanel";

export function CreateShareForm() {
  const [categories, setCategories] = useState<HealthCategoryId[]>([]);
  const [identifier, setIdentifier] = useState("");
  const [durationHours, setDurationHours] = useState(24);
  const [appliedRoleId, setAppliedRoleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<SharingSession | null>(null);

  const mutation = useCreateSharingSession();

  function applyRole(role: PermissionRole) {
    setCategories(role.categoryIds);
    setDurationHours(role.defaultDurationHours);
    setAppliedRoleId(role.id);
  }

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
      setCategories([]);
      setIdentifier("");
      setAppliedRoleId(null);
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
        <RolePicker
          appliedRoleId={appliedRoleId}
          onApply={applyRole}
          disabled={mutation.isPending}
        />
        <CategoryPicker
          selected={categories}
          onChange={(next) => {
            setCategories(next);
            setAppliedRoleId(null);
          }}
          disabled={mutation.isPending}
        />
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
        <DurationPicker
          key={appliedRoleId ?? "manual"}
          value={durationHours}
          onChange={(hours) => {
            setDurationHours(hours);
            setAppliedRoleId(null);
          }}
          disabled={mutation.isPending}
        />
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
