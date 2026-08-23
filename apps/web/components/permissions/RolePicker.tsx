"use client";

import type { PermissionRole } from "@/lib/api/types";
import { usePermissionRoles } from "@/lib/permissions/hooks";
import { cn } from "@/lib/utils/cn";

/** Lets a patient apply a saved permission role's categories + duration
 * instead of re-picking them by hand. Renders nothing if the patient hasn't
 * saved any roles yet — no empty-state clutter on the share form. */
export function RolePicker({
  appliedRoleId,
  onApply,
  disabled,
}: {
  appliedRoleId: string | null;
  onApply: (role: PermissionRole) => void;
  disabled?: boolean;
}) {
  const { data: roles } = usePermissionRoles();

  if (!roles || roles.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-[var(--color-text-muted)]">Apply a saved role:</span>
      {roles.map((role) => (
        <button
          key={role.id}
          type="button"
          disabled={disabled}
          onClick={() => onApply(role)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
            role.id === appliedRoleId
              ? "border-[var(--color-brand)] bg-[var(--color-brand-tint)] text-[var(--color-brand)]"
              : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
          )}
        >
          {role.name}
        </button>
      ))}
    </div>
  );
}
