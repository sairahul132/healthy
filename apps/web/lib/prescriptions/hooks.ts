"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as prescriptionsApi from "@/lib/api/prescriptions";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED"]);

export const prescriptionsKeys = {
  list: ["prescriptions"] as const,
  detail: (id: string) => ["prescriptions", id] as const,
  items: (id: string) => ["prescriptions", id, "items"] as const,
};

export function usePrescriptions() {
  return useQuery({
    queryKey: prescriptionsKeys.list,
    queryFn: () => prescriptionsApi.listPrescriptions(),
    refetchInterval: (query) => {
      const prescriptions = query.state.data;
      const hasInFlight = prescriptions?.some((p) => !TERMINAL_STATUSES.has(p.status));
      return hasInFlight ? 700 : false;
    },
  });
}

export function usePrescription(id: string) {
  return useQuery({
    queryKey: prescriptionsKeys.detail(id),
    queryFn: () => prescriptionsApi.getPrescription(id),
    refetchInterval: (query) =>
      query.state.data && !TERMINAL_STATUSES.has(query.state.data.status) ? 700 : false,
  });
}

export function usePrescriptionItems(id: string, enabled: boolean) {
  return useQuery({
    queryKey: prescriptionsKeys.items(id),
    queryFn: () => prescriptionsApi.getPrescriptionItems(id),
    enabled,
  });
}

export function useUploadPrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => prescriptionsApi.uploadPrescription(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: prescriptionsKeys.list });
    },
  });
}

export function useCorrectPrescriptionItem(prescriptionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      input,
    }: {
      itemId: string;
      input: prescriptionsApi.CorrectPrescriptionItemInput;
    }) => prescriptionsApi.correctPrescriptionItem(prescriptionId, itemId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: prescriptionsKeys.items(prescriptionId) });
    },
  });
}
