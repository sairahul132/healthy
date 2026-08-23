"use client";

import { useState } from "react";
import type { HealthCategoryId, PermissionRole } from "@/lib/api/types";
import { ApiError } from "@/lib/api/types";
import { useCreateRole, useUpdateRole } from "@/lib/permissions/hooks";
import { Button } from "@/components/ui/Button";
import { DurationPicker } from "@/components/ui/DurationPicker";
import { Field } from "@/components/ui/Field";
import { CategoryPicker } from "@/components/sharing/CategoryPicker";

/** Create-a-role form; also doubles as the inline edit form when `role` is
 * passed (RoleList renders one per role being edited). */
export function RoleForm({ role, onSaved }: { role?: PermissionRole; onSaved?: () => void }) {
  const [name, setName] = useState(role?.name ?? "");
  const [categories, setCategories] = useState<HealthCategoryId[]>(role?.categoryIds ?? []);
  const [durationHours, setDurationHours] = useState(role?.defaultDurationHours ?? 24 * 30);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const mutation = role ? updateMutation : createMutation;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Give this role a name.");
      return;
    }
    if (categories.length === 0) {
      setError("Select at least one category.");
      return;
    }

    try {
      const input = {
        name: name.trim(),
        categoryIds: categories,
        defaultDurationHours: Math.round(durationHours),
      };
      if (role) {
        await updateMutation.mutateAsync({ id: role.id, input });
      } else {
        await createMutation.mutateAsync(input);
        setName("");
        setCategories([]);
        setDurationHours(24 * 30);
      }
      onSaved?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this role. Try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field
        label="Role name"
        placeholder="e.g. Family Doctor"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={mutation.isPending}
      />

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">Categories</label>
        <CategoryPicker selected={categories} onChange={setCategories} disabled={mutation.isPending} />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
          Default access duration
        </label>
        <DurationPicker value={durationHours} onChange={setDurationHours} disabled={mutation.isPending} />
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" isLoading={mutation.isPending}>
          {role ? "Save changes" : "Create role"}
        </Button>
        {role ? (
          <Button type="button" size="sm" variant="secondary" onClick={onSaved} disabled={mutation.isPending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
