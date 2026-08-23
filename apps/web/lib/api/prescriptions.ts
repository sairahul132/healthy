import { apiFetch, apiUpload } from "./client";
import type { Prescription, PrescriptionItem } from "./types";

export function listPrescriptions(): Promise<Prescription[]> {
  return apiFetch<Prescription[]>("/prescriptions");
}

export function getPrescription(id: string): Promise<Prescription> {
  return apiFetch<Prescription>(`/prescriptions/${id}`);
}

export function getPrescriptionItems(id: string): Promise<PrescriptionItem[]> {
  return apiFetch<PrescriptionItem[]>(`/prescriptions/${id}/items`);
}

export function uploadPrescription(file: File): Promise<Prescription> {
  const formData = new FormData();
  formData.append("file", file, file.name);
  return apiUpload<Prescription>("/prescriptions/upload", formData);
}

export interface CorrectPrescriptionItemInput {
  medicineName: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
}

export function correctPrescriptionItem(
  prescriptionId: string,
  itemId: string,
  input: CorrectPrescriptionItemInput,
): Promise<PrescriptionItem> {
  return apiFetch<PrescriptionItem>(`/prescriptions/${prescriptionId}/items/${itemId}`, {
    method: "PATCH",
    body: input,
  });
}
