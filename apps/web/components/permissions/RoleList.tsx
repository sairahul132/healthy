"use client";

import { useState } from "react";
import type { PermissionRole } from "@/lib/api/types";
import { getCategory } from "@/lib/health/categories";
import { useDeleteRole, usePermissionRoles } from "@/lib/permissions/hooks";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { RoleForm } from "./RoleForm";

function formatDuration(hours: number): string {
  if (hours % (24 * 30) === 0) return `${hours / (24 * 30)} month${hours === 24 * 30 ? "" : "s"}`;
  if (hours % 24 === 0) return `${hours / 24} day${hours === 24 ? "" : "s"}`;
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

function RoleRow({ role }: { role: PermissionRole }) {
  const deleteMutation = useDeleteRole();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (editing) {
    return (
      <Card className="p-5">
        <RoleForm role={role} onSaved={() => setEditing(false)} />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">{role.name}</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Default access: {formatDuration(role.defaultDurationHours)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {role.categoryIds.map((id) => {
          const category = getCategory(id);
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]"
            >
              <span aria-hidden="true">{category.icon}</span>
              {category.label}
            </span>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2">
        {confirming ? (
          <>
            <span className="text-xs text-[var(--color-text-muted)]">Delete this role?</span>
            <Button
              type="button"
              size="sm"
              variant="danger"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(role.id, { onSettled: () => setConfirming(false) })}
            >
              Yes, delete
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(true)}>
              Delete
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

export function RoleList() {
  const { data: roles, isLoading, isError, refetch } = usePermissionRoles();

  if (isLoading) return <LoadingState label="Loading your roles…" />;
  if (isError) {
    return (
      <ErrorState
        description="We couldn't load your roles."
        action={
          <Button size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }
  if (!roles || roles.length === 0) {
    return (
      <EmptyState
        title="No roles yet"
        description="Create a role to bundle categories and a default duration you can reuse every time you share."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {roles.map((role) => (
        <RoleRow key={role.id} role={role} />
      ))}
    </div>
  );
}
