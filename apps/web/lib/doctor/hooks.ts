"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as doctorsApi from "@/lib/api/doctors";
import type { HealthCategoryId } from "@/lib/api/types";
import { ApiError } from "@/lib/api/types";

export const doctorKeys = {
  profile: ["doctor", "profile"] as const,
  patients: ["doctor", "patients"] as const,
  patientCategories: (sessionId: string) => ["doctor", "patients", sessionId, "categories"] as const,
};

export function useDoctorProfile() {
  return useQuery({
    queryKey: doctorKeys.profile,
    queryFn: async () => {
      try {
        return await doctorsApi.getDoctorProfile();
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
  });
}

export function useRegisterDoctorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: doctorsApi.registerDoctorProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: doctorKeys.profile });
    },
  });
}

export function useDoctorPatients(enabled: boolean) {
  return useQuery({
    queryKey: doctorKeys.patients,
    queryFn: () => doctorsApi.listDoctorPatients(),
    enabled,
  });
}

export function useDoctorPatientCategories(sessionId: string) {
  return useQuery({
    queryKey: doctorKeys.patientCategories(sessionId),
    queryFn: () => doctorsApi.getDoctorPatientCategories(sessionId),
  });
}

export function useDoctorPatientCategoryResults(sessionId: string, category: HealthCategoryId) {
  return useQuery({
    queryKey: [...doctorKeys.patientCategories(sessionId), category, "results"],
    queryFn: () => doctorsApi.getDoctorPatientCategoryResults(sessionId, category),
  });
}
