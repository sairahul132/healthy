import { apiFetch } from "./client";
import type { DoctorPatientSession, DoctorProfile, HealthCategoryId, LabResult, ShareCategories } from "./types";

export interface RegisterDoctorProfileInput {
  fullName: string;
  registrationNumber: string;
  organization: string;
  specialty?: string;
}

export function registerDoctorProfile(input: RegisterDoctorProfileInput): Promise<DoctorProfile> {
  return apiFetch<DoctorProfile>("/doctors/register", { method: "POST", body: input });
}

export function getDoctorProfile(): Promise<DoctorProfile> {
  return apiFetch<DoctorProfile>("/doctors/me");
}

export function listDoctorPatients(): Promise<DoctorPatientSession[]> {
  return apiFetch<DoctorPatientSession[]>("/doctors/patients");
}

export function getDoctorPatientCategories(sessionId: string): Promise<ShareCategories> {
  return apiFetch<ShareCategories>(`/doctors/patients/${sessionId}/categories`);
}

export function getDoctorPatientCategoryResults(
  sessionId: string,
  category: HealthCategoryId,
): Promise<LabResult[]> {
  return apiFetch<LabResult[]>(`/doctors/patients/${sessionId}/categories/${category}/results`);
}
