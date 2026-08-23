"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as medicinesApi from "@/lib/api/medicines";

export const medicinesKeys = {
  list: ["medicines"] as const,
};

export function useMedicines() {
  return useQuery({
    queryKey: medicinesKeys.list,
    queryFn: () => medicinesApi.listMedicines(),
  });
}

export function useCreateMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: medicinesApi.createMedicine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicinesKeys.list });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

export function useUpdateMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: medicinesApi.UpdateMedicineInput }) =>
      medicinesApi.updateMedicine(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicinesKeys.list });
    },
  });
}
