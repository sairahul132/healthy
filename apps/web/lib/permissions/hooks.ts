"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as permissionsApi from "@/lib/api/permissions";

export const permissionsKeys = {
  roles: ["permissions", "roles"] as const,
};

export function usePermissionRoles() {
  return useQuery({
    queryKey: permissionsKeys.roles,
    queryFn: () => permissionsApi.listRoles(),
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: permissionsApi.CreateRoleInput) => permissionsApi.createRole(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionsKeys.roles });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: permissionsApi.UpdateRoleInput }) =>
      permissionsApi.updateRole(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionsKeys.roles });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => permissionsApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionsKeys.roles });
    },
  });
}
