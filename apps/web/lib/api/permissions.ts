import { apiFetch } from "./client";
import type { HealthCategoryId, PermissionRole } from "./types";

export interface CreateRoleInput {
  name: string;
  categoryIds: HealthCategoryId[];
  defaultDurationHours: number;
}

export function createRole(input: CreateRoleInput): Promise<PermissionRole> {
  return apiFetch<PermissionRole>("/permissions/roles", { method: "POST", body: input });
}

export function listRoles(): Promise<PermissionRole[]> {
  return apiFetch<PermissionRole[]>("/permissions/roles");
}

export interface UpdateRoleInput {
  name?: string;
  categoryIds?: HealthCategoryId[];
  defaultDurationHours?: number;
}

export function updateRole(id: string, input: UpdateRoleInput): Promise<PermissionRole> {
  return apiFetch<PermissionRole>(`/permissions/roles/${id}`, { method: "PATCH", body: input });
}

export function deleteRole(id: string): Promise<void> {
  return apiFetch<void>(`/permissions/roles/${id}`, { method: "DELETE" });
}
